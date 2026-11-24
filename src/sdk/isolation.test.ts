import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { idFields, isolationProbes, isolationProblems, type FeatureIsolation } from './isolation';

const id = z.number().int().positive();
const draft = z.object({ title: z.string(), folderId: id.nullable() });

const COMMANDS = [
    { command: 'notes.list', input: z.object({ archived: z.boolean().optional() }) },
    { command: 'notes.get', input: z.object({ noteId: id }) },
    { command: 'notes.add', input: z.object({ note: draft }) },
    { command: 'notes.edit', input: z.object({ noteId: id, note: draft }) },
    {
        command: 'notes.reorder',
        input: z.object({ folderId: id.nullable(), noteIds: z.array(id).min(1) })
    },
    { command: 'notes.folderDelete', input: z.object({ folderId: id }) },
    { command: 'notes.import', input: z.object({ providerId: z.string() }) },
    {
        command: 'notes.publish',
        input: z.object({ slug: z.string() }),
        access: { item: () => undefined }
    }
];

function block(over: Partial<FeatureIsolation> = {}): FeatureIsolation {
    return {
        sampleIds: { noteId: 7, folderId: 3 },
        seed: async () => ({ noteId: 7, folderId: 3 }),
        reads: (ids) => [['notes.get', { noteId: ids.noteId }]],
        probes: (ids) => [
            ['notes.add', { note: { title: 'x', folderId: ids.folderId } }],
            ['notes.edit', { noteId: ids.noteId, note: { title: 'x', folderId: null } }],
            ['notes.reorder', { folderId: ids.folderId, noteIds: [ids.noteId] }],
            ['notes.publish', { slug: 'x' }]
        ],
        items: ['noteId'],
        exempt: { 'notes.import': 'Une référence chez un fournisseur, pas une ligne du module.' },
        ...over
    };
}

describe('idFields', () => {
    it('trouve les champs d’identifiant, imbriqués, en tableau ou sous un enrobage', () => {
        assert.deepEqual(idFields(z.object({ noteId: id, note: draft })), [
            'note.folderId',
            'noteId'
        ]);
        assert.deepEqual(
            idFields(
                z.object({ noteIds: z.array(id), id: id.optional(), ids: z.array(id).default([]) })
            ),
            ['id', 'ids', 'noteIds']
        );
        assert.deepEqual(
            idFields(z.object({ rows: z.array(z.object({ cardId: id, label: z.string() })) })),
            ['rows.cardId']
        );
        assert.deepEqual(
            idFields(z.object({ target: z.object({ deviceId: z.string() }).optional() })),
            ['target.deviceId']
        );
    });

    it('lit sous un refine et dans chaque branche d’une union', () => {
        const refined = z
            .object({ roleId: id, access: z.string().optional() })
            .refine((v) => v.access !== undefined);
        assert.deepEqual(idFields(refined), ['roleId']);
        const union = z.discriminatedUnion('kind', [
            z.object({ kind: z.literal('a'), siteId: id }),
            z.object({ kind: z.literal('b'), formId: id })
        ]);
        assert.deepEqual(idFields(z.object({ source: union })), ['source.formId', 'source.siteId']);
    });

    it('ne prend pas un champ qui finit par hasard comme un identifiant', () => {
        assert.deepEqual(
            idFields(
                z.object({
                    valid: z.boolean(),
                    paid: z.boolean(),
                    android: z.string(),
                    name: z.string()
                })
            ),
            []
        );
    });
});

describe('isolationProbes', () => {
    it('ajoute aux sondes écrites celles des commandes qui ne prennent que des identifiants semés', () => {
        const probes = isolationProbes(COMMANDS, block(), { noteId: 41, folderId: 9 });
        assert.deepEqual(
            probes.map(([command]) => command),
            [
                'notes.add',
                'notes.edit',
                'notes.reorder',
                'notes.publish',
                'notes.get',
                'notes.folderDelete'
            ]
        );
        assert.deepEqual(probes[4], ['notes.get', { noteId: 41 }]);
        assert.deepEqual(probes[5], ['notes.folderDelete', { folderId: 9 }]);
    });

    it('ne dérive rien pour une commande dispensée, ni pour un identifiant qui n’est pas semé', () => {
        const probes = isolationProbes(COMMANDS, block({ sampleIds: { noteId: 7 } }), {
            noteId: 41
        });
        assert.equal(
            probes.some(([command]) => command === 'notes.folderDelete'),
            false
        );
        assert.equal(
            probes.some(([command]) => command === 'notes.import'),
            false
        );
    });
});

describe('isolationProblems', () => {
    it('ne trouve rien à un bloc complet', () => {
        assert.deepEqual(isolationProblems(COMMANDS, block()), []);
    });

    it('réclame une sonde pour une commande à identifiant, ou à élément, qui n’en a pas', () => {
        const problems = isolationProblems(COMMANDS, block({ probes: () => [], exempt: {} }));
        assert.deepEqual(problems, [
            '"notes.add" takes an id (note.folderId) and has neither a probe nor an exemption',
            '"notes.edit" takes an id (note.folderId, noteId) and has neither a probe nor an exemption',
            '"notes.reorder" takes an id (folderId, noteIds) and has neither a probe nor an exemption',
            '"notes.import" takes an id (providerId) and has neither a probe nor an exemption',
            '"notes.publish" takes an id (access.item) and has neither a probe nor an exemption'
        ]);
    });

    it('refuse une sonde ou une lecture que le schéma de sa commande n’accepte pas', () => {
        const problems = isolationProblems(
            COMMANDS,
            block({
                reads: () => [['notes.get', { noteId: 'sept' }]],
                probes: (ids) => [
                    ...block().probes(ids),
                    ['notes.gone', {}],
                    ['notes.edit', { noteId: ids.noteId }]
                ]
            })
        );
        assert.equal(problems.length, 3);
        assert.match(problems[0], /^probe "notes\.gone": not a command of this feature$/);
        assert.match(problems[1], /^probe "notes\.edit": input refused by its schema/);
        assert.match(problems[2], /^read "notes\.get": input refused by its schema/);
    });

    it('refuse une dispense sans raison, inutile, ou doublée d’une sonde', () => {
        const problems = isolationProblems(
            COMMANDS,
            block({
                exempt: {
                    'notes.import': ' ',
                    'notes.list': 'x',
                    'notes.edit': 'x',
                    'notes.gone': 'x'
                }
            })
        );
        assert.deepEqual(problems, [
            'exempt "notes.list": takes no id, nothing to exempt',
            'exempt "notes.edit": it is probed too',
            'exempt "notes.import": no reason',
            'exempt "notes.gone": not a command of this feature'
        ]);
    });

    it('n’admet une commande indulgente que sondée, et avec sa raison', () => {
        assert.deepEqual(
            isolationProblems(
                COMMANDS,
                block({ lenient: { 'notes.reorder': 'La liste envoyée peut dater.' } })
            ),
            []
        );
        assert.deepEqual(
            isolationProblems(
                COMMANDS,
                block({ lenient: { 'notes.reorder': '', 'notes.list': 'x' } })
            ),
            ['lenient "notes.reorder": no reason', 'lenient "notes.list": not a probed command']
        );
    });

    it('réclame au moins une lecture, et des éléments qui soient des identifiants semés', () => {
        const problems = isolationProblems(
            COMMANDS,
            block({ reads: () => [], items: ['boardId'] })
        );
        assert.deepEqual(problems, [
            'reads: at least one command the victim reads its data with',
            'items "boardId": not a key of sampleIds'
        ]);
    });
});
