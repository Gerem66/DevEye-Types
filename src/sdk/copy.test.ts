import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    exportItemTree,
    FeatureError,
    importItemTree,
    itemTierOf,
    itemTreeProblem,
    movableCellsOf,
    type ItemTree,
    type SdkCipher,
    type SdkQueryable
} from './server';

/**
 * La copie d'un élément. Ce qui se vérifie ici est ce qui ne pardonne pas : une
 * copie accrochée à l'original, une cellule recopiée sous une clé que la
 * destination n'a pas, et un paquet venu d'un navigateur qui écrirait ailleurs
 * que dans l'arbre.
 */

type Row = Record<string, unknown>;

/** La lecture d'une table qui pend à l'élément par une autre. */
const SCOPED_READ = new RegExp(
    '^SELECT \\* FROM (\\w+) WHERE (\\w+) IN ' +
        '\\(SELECT (\\w+) FROM (\\w+) WHERE (\\w+) = \\?\\)'
);

/** Une base qui ne comprend que le SQL du moteur : lectures par propriétaire, insertions, une mise à jour. */
function fakeDb(tables: Record<string, { columns: string[]; rows: Row[] }>) {
    let nextId = 1000;
    const q: SdkQueryable = {
        query: async <T extends object>(sql: string, params: unknown[] = []) => {
            const show = /^SHOW COLUMNS FROM (\w+)/.exec(sql);
            if (show) {
                return tables[show[1]].columns.map((Field) => ({
                    Field,
                    Extra: ''
                })) as unknown as T[];
            }
            if (/^SELECT COALESCE\(MAX/.test(sql)) return [{ next: 12 }] as unknown as T[];
            const taken =
                /^SELECT COUNT\(\*\) AS n FROM (\w+) WHERE (\w+) = \? AND (\w+) = \?/.exec(sql);
            if (taken) {
                const n = tables[taken[1]].rows.filter(
                    (r) => r[taken[2]] === params[0] && r[taken[3]] === params[1]
                ).length;
                return [{ n }] as unknown as T[];
            }
            const tier = /^SELECT (\w+) AS tier FROM (\w+) WHERE (\w+) = \?/.exec(sql);
            if (tier) {
                return tables[tier[2]].rows
                    .filter((r) => r[tier[3]] === params[0])
                    .map((r) => ({ tier: r[tier[1]] })) as unknown as T[];
            }
            const scoped = SCOPED_READ.exec(sql);
            if (scoped) {
                const parents = new Set(
                    tables[scoped[4]].rows
                        .filter((r) => r[scoped[5]] === params[0])
                        .map((r) => r[scoped[3]])
                );
                return tables[scoped[1]].rows.filter((r) =>
                    parents.has(r[scoped[2]])
                ) as unknown as T[];
            }
            const read = /^SELECT \* FROM (\w+) WHERE (\w+) = \?/.exec(sql);
            if (read) {
                return tables[read[1]].rows.filter(
                    (r) => r[read[2]] === params[0]
                ) as unknown as T[];
            }
            throw new Error(`SQL inattendu : ${sql}`);
        },
        execute: async (sql: string, params: unknown[] = []) => {
            const insert = /^INSERT INTO (\w+) \(([^)]*)\)/.exec(sql);
            if (insert) {
                const names = insert[2].split(', ');
                const row: Row = Object.fromEntries(names.map((n, i) => [n, params[i]]));
                // Une table de liaison n'a pas d'identifiant à donner.
                if (row.id === undefined && tables[insert[1]].columns.includes('id')) {
                    row.id = nextId++;
                }
                tables[insert[1]].rows.push(row);
                return { affectedRows: 1, insertId: typeof row.id === 'number' ? row.id : 0 };
            }
            const update = /^UPDATE (\w+) SET (\w+) = \? WHERE (\w+) = \?/.exec(sql);
            if (update) {
                for (const r of tables[update[1]].rows) {
                    if (r[update[3]] === params[1]) r[update[2]] = params[0];
                }
                return { affectedRows: 1, insertId: 0 };
            }
            throw new Error(`SQL inattendu : ${sql}`);
        }
    };
    return q;
}

function cipherOf(tag: string): SdkCipher {
    return {
        encrypt: async (plain) => `${tag}:${plain}`,
        decrypt: async (blob) => blob.slice(tag.length + 1),
        tryDecrypt: async (blob) => (blob.startsWith(`${tag}:`) ? blob.slice(tag.length + 1) : null)
    };
}

const into = (tag: string) => ({ workspaceId: 42, userId: 5, cipher: cipherOf(tag) });

const TREE: ItemTree = [
    {
        table: 'boards',
        idColumn: 'id',
        ownerColumn: 'id',
        workspaceColumn: 'workspace_id',
        userColumn: 'user_id',
        orderColumn: 'sort_order',
        sealed: ['content', 'last_error'],
        omit: ['credential_id', 'last_error'],
        tier: { column: 'tier', open: 'open', private: 'guarded' }
    },
    {
        table: 'columns',
        idColumn: 'id',
        ownerColumn: 'board_id',
        workspaceColumn: 'workspace_id',
        sealed: ['content']
    },
    {
        table: 'cards',
        idColumn: 'id',
        ownerColumn: 'board_id',
        sealed: ['content'],
        refs: { column_id: 'columns', parent_id: 'cards' }
    },
    {
        table: 'deps',
        ownerColumn: 'board_id',
        refs: { card_id: 'cards', blocked_by: 'cards' }
    },
    {
        table: 'labels',
        idColumn: 'id',
        ownerColumn: 'card_id',
        ownerScope: 'SELECT id FROM cards WHERE board_id = ?',
        refs: { card_id: 'cards' },
        sealed: ['content']
    },
    { table: 'history', idColumn: 'id', ownerColumn: 'board_id', sealed: ['content'], cache: true }
];

function seed(): Record<string, { columns: string[]; rows: Row[] }> {
    return {
        boards: {
            columns: [
                'id',
                'workspace_id',
                'user_id',
                'tier',
                'content',
                'last_error',
                'sort_order',
                'credential_id'
            ],
            rows: [
                {
                    id: 1,
                    workspace_id: 7,
                    user_id: 3,
                    tier: 'open',
                    content: 'A:tableau',
                    last_error: 'A:oups',
                    sort_order: 4,
                    credential_id: 9
                }
            ]
        },
        columns: {
            columns: ['id', 'board_id', 'workspace_id', 'content'],
            rows: [
                { id: 10, board_id: 1, workspace_id: 7, content: 'A:à faire' },
                { id: 11, board_id: 1, workspace_id: 7, content: 'A:fait' }
            ]
        },
        cards: {
            columns: ['id', 'board_id', 'column_id', 'parent_id', 'content'],
            rows: [
                // L'enfant avant son parent : l'auto-référence ne peut pas se poser à l'insertion.
                { id: 20, board_id: 1, column_id: 11, parent_id: 21, content: 'A:sous-carte' },
                { id: 21, board_id: 1, column_id: 10, parent_id: null, content: 'A:carte' }
            ]
        },
        deps: {
            columns: ['board_id', 'card_id', 'blocked_by'],
            rows: [{ board_id: 1, card_id: 20, blocked_by: 21 }]
        },
        labels: {
            columns: ['id', 'card_id', 'content'],
            rows: [{ id: 30, card_id: 20, content: 'A:urgent' }]
        },
        history: {
            columns: ['id', 'board_id', 'content'],
            rows: [{ id: 40, board_id: 1, content: 'A:ancien' }]
        }
    };
}

describe('copie d’un élément', () => {
    it('recopie l’arbre entier sous de nouveaux ids, sous l’autre clé, accroché à la copie', async () => {
        const source = seed();
        const rows = await exportItemTree(fakeDb(source), TREE, 1, cipherOf('A'));

        // En clair, sans ce qui ne voyage pas : ni espace, ni palier, ni omis, ni cache.
        assert.deepEqual(rows.boards, [{ id: 1, content: 'tableau' }]);
        assert.equal(rows.history, undefined);

        const target = seed();
        for (const t of Object.values(target)) t.rows.length = 0;
        const newId = await importItemTree(fakeDb(target), TREE, rows, into('B'));

        assert.deepEqual(target.boards.rows, [
            {
                id: 1000,
                workspace_id: 42,
                user_id: 5,
                sort_order: 12,
                tier: 'open',
                content: 'B:tableau'
            }
        ]);
        assert.equal(newId, '1000');
        assert.deepEqual(
            target.columns.rows.map((r) => [r.board_id, r.workspace_id, r.content]),
            [
                [1000, 42, 'B:à faire'],
                [1000, 42, 'B:fait']
            ]
        );
        const [child, parent] = target.cards.rows;
        assert.equal(child.board_id, 1000);
        assert.equal(child.column_id, target.columns.rows[1].id);
        assert.equal(child.parent_id, parent.id, 'l’auto-référence suit la copie');
        assert.equal(target.labels.rows[0].card_id, child.id);
        assert.deepEqual(
            target.deps.rows,
            [{ board_id: 1000, card_id: child.id, blocked_by: parent.id }],
            'une table de liaison suit la copie des deux côtés'
        );
        assert.equal(target.history.rows.length, 0);
    });

    it('annule tout si une cellule résiste, avant d’avoir rien rendu', async () => {
        const source = seed();
        source.cards.rows[1].content = 'AUTRE:illisible';
        await assert.rejects(exportItemTree(fakeDb(source), TREE, 1, cipherOf('A')), FeatureError);
    });

    it('scelle selon le palier que la destination a retenu', async () => {
        const source = seed();
        source.boards.rows[0].tier = 'guarded';
        assert.equal(await itemTierOf(fakeDb(source), TREE, 1), 'private');
        assert.equal(await itemTierOf(fakeDb(source), TREE, 99), null);

        const rows = await exportItemTree(fakeDb(source), TREE, 1, cipherOf('A'));
        const target = seed();
        for (const t of Object.values(target)) t.rows.length = 0;
        await importItemTree(fakeDb(target), TREE, rows, { ...into('P'), tier: 'private' });
        assert.equal(target.boards.rows[0].tier, 'guarded');
        assert.equal(target.boards.rows[0].content, 'P:tableau');
    });

    it('refuse un paquet qui écrirait hors de l’arbre', async () => {
        const target = seed();
        const q = fakeDb(target);
        const good = { boards: [{ id: 1, content: 'x' }] };
        await assert.rejects(
            importItemTree(q, TREE, { ...good, users: [{ id: 1 }] }, into('B')),
            /Table/
        );
        await assert.rejects(
            importItemTree(q, TREE, { ...good, history: [{ id: 1 }] }, into('B')),
            /Table/
        );
        for (const column of [
            'workspace_id',
            'user_id',
            'sort_order',
            'tier',
            'credential_id',
            'role'
        ]) {
            await assert.rejects(
                importItemTree(
                    q,
                    TREE,
                    { boards: [{ id: 1, content: 'x', [column]: 1 }] },
                    into('B')
                ),
                /Colonne/,
                column
            );
        }
        await assert.rejects(importItemTree(q, TREE, { boards: [] }, into('B')), /exactement un/);
        await assert.rejects(
            importItemTree(
                q,
                TREE,
                { ...good, cards: [{ id: 5, column_id: 999, content: 'x' }] },
                into('B')
            ),
            /orpheline/
        );
    });

    it('refuse un élément que la destination tient déjà sous le même nom', async () => {
        const tree: ItemTree = [
            { ...TREE[0], unique: { column: 'name_ref', message: 'Déjà là.' } }
        ];
        const target = seed();
        target.boards.columns.push('name_ref');
        target.boards.rows = [{ id: 2, workspace_id: 42, name_ref: 'abc' }];
        const rows = { boards: [{ id: 1, content: 'x', name_ref: 'abc' }] };
        await assert.rejects(importItemTree(fakeDb(target), tree, rows, into('B')), /Déjà là/);
        // Le même nom dans un AUTRE espace ne gêne pas.
        target.boards.rows[0].workspace_id = 7;
        await importItemTree(fakeDb(target), tree, rows, into('B'));
    });

    it('ne laisse pas un enfant s’accrocher à l’élément d’un autre', async () => {
        const target = seed();
        for (const t of Object.values(target)) t.rows.length = 0;
        const rows = {
            boards: [{ id: 1, content: 'x' }],
            columns: [{ id: 10, board_id: 555, content: 'y' }]
        };
        await importItemTree(fakeDb(target), TREE, rows, into('B'));
        assert.equal(target.columns.rows[0].board_id, 1000);
    });
});

const LABELS = TREE.find((t) => t.table === 'labels')!;

describe('arbre d’un élément', () => {
    it('donne au déplacement toutes ses cellules, caches compris', () => {
        const cells = movableCellsOf(TREE);
        assert.equal(cells.length, 6);
        assert.ok(cells.some((c) => c.table === 'history' && c.column === 'content'));
        assert.equal(
            cells.find((c) => c.table === 'labels')?.ownerScope,
            'SELECT id FROM cards WHERE board_id = ?'
        );
    });

    it('refuse au démarrage un arbre mal formé', () => {
        assert.equal(itemTreeProblem(TREE), null);
        assert.match(itemTreeProblem([]) ?? '', /empty/);
        assert.match(
            itemTreeProblem([TREE[0], { table: 'x', ownerColumn: 'b', sealed: ['c'] }]) ?? '',
            /link table/
        );
        assert.match(itemTreeProblem([{ ...TREE[0], ownerColumn: 'x' }]) ?? '', /root/);
        assert.match(itemTreeProblem([TREE[0], TREE[2]]) ?? '', /before/);
        assert.match(
            itemTreeProblem([TREE[0], { ...TREE[1], table: 'columns; DROP' }]) ?? '',
            /identifier/
        );
        assert.match(
            itemTreeProblem([TREE[0], TREE[1], TREE[2], { ...LABELS, refs: {} }]) ?? '',
            /scoped/
        );
    });
});
