import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    exportItemTree,
    FeatureError,
    importItemTree,
    itemDigestTaken,
    itemTierOf,
    itemTreeProblem,
    movableCellsOf,
    rekeyItemDigests,
    rekeyTreeDigests,
    type ItemDigestKeys,
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

/** La lecture paginée des éléments d'un arbre, par clé primaire. */
const PAGED_READ = new RegExp(
    '^SELECT (\\w+) AS id, (\\w+) AS workspace_id FROM (\\w+) ' +
        'WHERE \\w+ > \\? ORDER BY \\w+ ASC LIMIT (\\d+)'
);

/** Une base qui ne comprend que le SQL du moteur : lectures par propriétaire, insertions, une mise à jour. */
function fakeDb(
    tables: Record<string, { columns: string[]; rows: Row[]; unique?: readonly string[] }>
) {
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
            const page = PAGED_READ.exec(sql);
            if (page) {
                return tables[page[3]].rows
                    .filter((r) => (r[page[1]] as number) > (params[0] as number))
                    .sort((a, b) => (a[page[1]] as number) - (b[page[1]] as number))
                    .slice(0, Number(page[4]))
                    .map((r) => ({ id: r[page[1]], workspace_id: r[page[2]] })) as unknown as T[];
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
                const { rows, unique } = tables[update[1]];
                for (const r of rows) {
                    if (r[update[3]] !== params[1]) continue;
                    const next = { ...r, [update[2]]: params[0] };
                    const clash = rows.some(
                        (other) => other !== r && unique?.every((c) => other[c] === next[c])
                    );
                    if (clash) {
                        throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
                    }
                    r[update[2]] = params[0];
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

    it('expurge un secret de sa colonne scellée, et refuse une valeur scellée qui ne serait pas du texte', async () => {
        const tree: ItemTree = [
            { ...TREE[0], redact: { content: (plain) => plain.replace('tableau', '•') } }
        ];
        const rows = await exportItemTree(fakeDb(seed()), tree, 1, cipherOf('A'));
        assert.equal(rows.boards[0].content, '•');

        const target = seed();
        await assert.rejects(
            importItemTree(
                fakeDb(target),
                TREE,
                { boards: [{ id: 1, content: { $wire: 'x' } }] },
                into('B')
            ),
            /Valeur inattendue/
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
        assert.match(
            itemTreeProblem([{ ...TREE[0], redact: { name: (p) => p } }]) ?? '',
            /redacted/
        );
    });
});

/**
 * Les condensés d'un arbre. Ce qui ne pardonne pas ici : un condensé qui
 * voyagerait d'un espace à l'autre (il relierait les deux), un nom tenu pour
 * libre parce que comparé au condensé d'ailleurs, et une reprise qui laisserait
 * des lignes à l'ancien format.
 */

/** Un condensé lisible : on y voit l'usage, la portée et la valeur. */
const KEYS: ItemDigestKeys = { ref: (purpose, scope, value) => `${purpose}/${scope}/${value}` };

const nameOf = (plain: string): string =>
    (JSON.parse(plain) as { name: string }).name.trim().toLowerCase();

const SITES: ItemTree = [
    {
        table: 'sites',
        idColumn: 'id',
        ownerColumn: 'id',
        workspaceColumn: 'workspace_id',
        unique: { column: 'name_ref', message: 'Un site du même nom existe déjà dans cet espace.' },
        sealed: ['content'],
        digests: [
            {
                column: 'name_ref',
                purpose: 'name',
                within: 'workspace',
                from: 'content',
                of: nameOf
            }
        ]
    },
    {
        table: 'pages',
        idColumn: 'id',
        ownerColumn: 'site_id',
        sealed: ['content'],
        digests: [
            { column: 'path_ref', purpose: 'path', within: 'item', from: 'content', of: nameOf }
        ]
    }
];

function sitesDb() {
    const tables = {
        sites: {
            columns: ['id', 'workspace_id', 'name_ref', 'content'],
            rows: [
                {
                    id: 1,
                    workspace_id: 7,
                    name_ref: 'ancien-1',
                    content: 'k7:{"name":" Vitrine "}'
                },
                { id: 2, workspace_id: 8, name_ref: 'ancien-2', content: 'k8:{"name":"vitrine"}' }
            ] as Row[]
        },
        pages: {
            columns: ['id', 'site_id', 'path_ref', 'content'],
            rows: [
                { id: 10, site_id: 1, path_ref: 'ancien-10', content: 'k7:{"name":"/Accueil"}' },
                { id: 11, site_id: 1, path_ref: 'ancien-11', content: 'k7:{"name":"/prix"}' },
                { id: 12, site_id: 2, path_ref: 'ancien-12', content: 'k8:{"name":"/accueil"}' }
            ] as Row[]
        }
    };
    return { tables, q: fakeDb(tables) };
}

const cipherFor = (workspaceId: number): SdkCipher => cipherOf(`k${workspaceId}`);

/** Une app et ses fiches de store : l'unicité tient à la table fille, et la valeur à une colonne en clair. */
const APPS: ItemTree = [
    {
        table: 'apps',
        idColumn: 'id',
        ownerColumn: 'id',
        workspaceColumn: 'workspace_id',
        sealed: ['content']
    },
    {
        table: 'listings',
        idColumn: 'id',
        ownerColumn: 'app_id',
        workspaceColumn: 'workspace_id',
        unique: { column: 'ref', message: 'Cette app est déjà suivie dans cet espace.' },
        sealed: ['content'],
        digests: [
            {
                column: 'ref',
                purpose: 'listing',
                within: 'workspace',
                from: 'content',
                of: (plain, row) => `${String(row.store)}:${nameOf(plain)}`
            }
        ]
    }
];

function appsDb() {
    const listing = (id: number, app: number, workspace: number, store: string): Row => ({
        id,
        app_id: app,
        workspace_id: workspace,
        store,
        ref: `ancien-${id}`,
        content: `k${workspace}:{"name":"com.demo"}`
    });
    const tables = {
        apps: {
            columns: ['id', 'workspace_id', 'content'],
            rows: [
                { id: 1, workspace_id: 7, content: 'k7:{"name":"Démo"}' },
                { id: 2, workspace_id: 8, content: 'k8:{"name":"Démo"}' }
            ] as Row[]
        },
        listings: {
            columns: ['id', 'app_id', 'workspace_id', 'store', 'ref', 'content'],
            rows: [
                listing(10, 1, 7, 'apple'),
                listing(11, 1, 7, 'google'),
                listing(12, 2, 8, 'apple')
            ]
        }
    };
    return { tables, q: fakeDb(tables) };
}

describe('condensés d’un arbre', () => {
    it('une copie n’emporte aucun condensé, et arrive avec ceux de sa destination', async () => {
        const { tables, q } = sitesDb();
        const rows = await exportItemTree(q, SITES, 1, cipherOf('k7'));
        assert.equal('name_ref' in rows.sites[0], false);
        assert.equal('path_ref' in rows.pages[0], false);

        const newId = await importItemTree(q, SITES, rows, { ...into('k42'), keys: KEYS });
        const copy = tables.sites.rows.find((r) => String(r.id) === newId);
        assert.equal(copy?.name_ref, 'name/42/vitrine');
        assert.deepEqual(
            tables.pages.rows.filter((r) => String(r.site_id) === newId).map((r) => r.path_ref),
            [`path/${newId}//accueil`, `path/${newId}//prix`]
        );
    });

    it('refuse un paquet qui apporte son condensé, et un arbre à condensés sans clés à l’arrivée', async () => {
        const { q } = sitesDb();
        const rows = await exportItemTree(q, SITES, 1, cipherOf('k7'));
        const forged = { ...rows, sites: [{ ...rows.sites[0], name_ref: 'name/42/libre' }] };
        await assert.rejects(importItemTree(q, SITES, forged, { ...into('k42'), keys: KEYS }), {
            code: 'validation'
        });
        await assert.rejects(importItemTree(q, SITES, rows, into('k42')), /needs `keys`/);
    });

    it('juge l’unicité sur le condensé de la destination, pas sur celui du départ', async () => {
        const { tables, q } = sitesDb();
        tables.sites.rows.push({
            id: 3,
            workspace_id: 42,
            name_ref: 'name/42/vitrine',
            content: 'k42:{}'
        });
        const rows = await exportItemTree(q, SITES, 1, cipherOf('k7'));
        await assert.rejects(importItemTree(q, SITES, rows, { ...into('k42'), keys: KEYS }), {
            code: 'conflict'
        });
    });

    it('un déplacement sait d’avance si le nom est pris à l’arrivée, puis recalcule pour elle', async () => {
        const { tables, q } = sitesDb();
        const target = { cipher: cipherOf('k7'), keys: KEYS, workspaceId: 8 };
        // L'espace 8 tient déjà « vitrine », sous son ancien condensé : il faut d'abord le reprendre.
        assert.equal(await itemDigestTaken(q, SITES, 1, target), false);
        await rekeyTreeDigests(q, SITES, { cipherFor, keys: KEYS });
        assert.equal(await itemDigestTaken(q, SITES, 1, target), true);
        assert.equal(await itemDigestTaken(q, SITES, 1, { ...target, workspaceId: 9 }), false);

        const pass = await rekeyItemDigests(q, SITES, 1, { ...target, workspaceId: 9 });
        assert.deepEqual(pass, { rewritten: 1, unreadable: 0 });
        assert.equal(tables.sites.rows[0].name_ref, 'name/9/vitrine');
        // Les condensés liés à l'élément ne bougent pas avec lui.
        assert.equal(tables.pages.rows[0].path_ref, 'path/1//accueil');

        // Un déplacement ne relit pas ce qui ne dépend que de l'élément.
        tables.pages.rows[0].path_ref = 'ancien-10';
        const moved = await rekeyItemDigests(
            q,
            SITES,
            1,
            { ...target, workspaceId: 10 },
            { within: 'workspace' }
        );
        assert.deepEqual(moved, { rewritten: 1, unreadable: 0 });
        assert.equal(tables.sites.rows[0].name_ref, 'name/10/vitrine');
        assert.equal(tables.pages.rows[0].path_ref, 'ancien-10');
    });

    it('la reprise réécrit chaque élément pour son espace, une seule fois', async () => {
        const { tables, q } = sitesDb();
        const first = await rekeyTreeDigests(q, SITES, { cipherFor, keys: KEYS });
        assert.deepEqual(first, { items: 2, rewritten: 5, unreadable: 0, duplicates: 0 });
        assert.deepEqual(
            tables.sites.rows.map((r) => r.name_ref),
            ['name/7/vitrine', 'name/8/vitrine']
        );
        assert.deepEqual(
            tables.pages.rows.map((r) => r.path_ref),
            ['path/1//accueil', 'path/1//prix', 'path/2//accueil']
        );
        const second = await rekeyTreeDigests(q, SITES, { cipherFor, keys: KEYS });
        assert.deepEqual(second, { items: 2, rewritten: 0, unreadable: 0, duplicates: 0 });
    });

    it('une cellule illisible reçoit un condensé à elle, pour qu’aucun ancien ne reste', async () => {
        const { tables, q } = sitesDb();
        tables.pages.rows[1].content = 'autre-clé:{"name":"/prix"}';
        tables.pages.rows[2].content = 'k8:pas du json';
        const pass = await rekeyTreeDigests(q, SITES, { cipherFor, keys: KEYS });
        assert.equal(pass.unreadable, 2);
        assert.match(String(tables.pages.rows[1].path_ref), /^path\/1\/.*unreadable:pages:11$/);
        assert.match(String(tables.pages.rows[2].path_ref), /^path\/2\/.*unreadable:pages:12$/);
    });

    it('deux lignes que l’ancien condensé distinguait : la première garde le nouveau, la reprise continue', async () => {
        const { tables, q } = sitesDb();
        // Deux pages du même chemin, écrites sous deux anciennes clés, et une table qui refuse le doublon.
        tables.pages.rows[1].content = 'k7:{"name":"/accueil"}';
        Object.assign(tables.pages, { unique: ['site_id', 'path_ref'] });
        const first = await rekeyTreeDigests(q, SITES, { cipherFor, keys: KEYS });
        assert.deepEqual(first, { items: 2, rewritten: 5, unreadable: 0, duplicates: 1 });
        assert.equal(tables.pages.rows[0].path_ref, 'path/1//accueil');
        assert.match(String(tables.pages.rows[1].path_ref), /^path\/1\/.*duplicate:pages:11$/);
        const second = await rekeyTreeDigests(q, SITES, { cipherFor, keys: KEYS });
        assert.deepEqual(second, { items: 2, rewritten: 0, unreadable: 0, duplicates: 1 });

        // Un déplacement, lui, s'arrête sur le refus de la base : il n'écarte rien.
        tables.pages.rows[1].path_ref = 'ancien-11';
        await assert.rejects(
            rekeyItemDigests(q, SITES, 1, { cipher: cipherOf('k7'), keys: KEYS, workspaceId: 7 }),
            { code: 'ER_DUP_ENTRY' }
        );
    });

    it('s’arrête sur un espace dont la clé ne s’ouvre pas, plutôt que de le laisser à l’ancien format', async () => {
        const { q } = sitesDb();
        const failing = (workspaceId: number): SdkCipher => {
            if (workspaceId === 8) throw new Error('clé de l’espace 8 illisible');
            return cipherFor(workspaceId);
        };
        await assert.rejects(
            rekeyTreeDigests(q, SITES, { cipherFor: failing, keys: KEYS }),
            /espace 8/
        );
    });

    it('la valeur d’un condensé peut tenir à une colonne en clair de sa ligne', async () => {
        const { tables, q } = appsDb();
        await rekeyTreeDigests(q, APPS, { cipherFor, keys: KEYS });
        // Le même identifiant sur deux stores n'est pas la même fiche.
        assert.deepEqual(
            tables.listings.rows.map((r) => r.ref),
            ['listing/7/apple:com.demo', 'listing/7/google:com.demo', 'listing/8/apple:com.demo']
        );
    });

    it('une table fille porte une unicité d’espace : à l’arrivée d’une copie, et avant un déplacement', async () => {
        const { tables, q } = appsDb();
        await rekeyTreeDigests(q, APPS, { cipherFor, keys: KEYS });
        const target = { cipher: cipherOf('k7'), keys: KEYS, workspaceId: 8 };
        // L'espace 8 suit déjà l'app Apple : l'app de l'espace 7, qui la suit aussi, n'y entre pas.
        assert.equal(await itemDigestTaken(q, APPS, 1, target), true);
        assert.equal(await itemDigestTaken(q, APPS, 1, { ...target, workspaceId: 9 }), false);

        const rows = await exportItemTree(q, APPS, 1, cipherOf('k7'));
        assert.equal('ref' in rows.listings[0], false);
        const newId = await importItemTree(q, APPS, rows, { ...into('k42'), keys: KEYS });
        assert.deepEqual(
            tables.listings.rows.filter((r) => String(r.app_id) === newId).map((r) => r.ref),
            ['listing/42/apple:com.demo', 'listing/42/google:com.demo']
        );
        // Une seconde copie au même endroit bute sur la fiche, pas sur l'app.
        await assert.rejects(importItemTree(q, APPS, rows, { ...into('k42'), keys: KEYS }), {
            code: 'conflict',
            message: 'Cette app est déjà suivie dans cet espace.'
        });
    });

    it('refuse au démarrage une déclaration de condensé mal formée', () => {
        const [apps, listings] = APPS;
        assert.equal(itemTreeProblem(APPS), null);
        assert.match(
            itemTreeProblem([
                apps,
                { ...listings, digests: [{ ...listings.digests![0], within: 'item' }] }
            ]) ?? '',
            /unique digest is computed within the workspace/
        );
        assert.match(
            itemTreeProblem([apps, { ...listings, workspaceColumn: undefined }]) ?? '',
            /names its workspaceColumn/
        );
        assert.match(
            itemTreeProblem([apps, { ...listings, orderColumn: 'sort_order' }]) ?? '',
            /orderColumn is for a root/
        );

        const [root, pages] = SITES;
        const digest = root.digests![0];
        const withRoot = (patch: object): ItemTree => [{ ...root, ...patch }, pages];
        assert.equal(itemTreeProblem(SITES), null);
        assert.match(
            itemTreeProblem(withRoot({ digests: [{ ...digest, from: 'autre' }] })) ?? '',
            /not a sealed column/
        );
        assert.match(
            itemTreeProblem(withRoot({ digests: [{ ...digest, within: 'item' }] })) ?? '',
            /within the workspace/
        );
        assert.match(itemTreeProblem(withRoot({ omit: ['content'] })) ?? '', /does not carry/);
        assert.match(
            itemTreeProblem(withRoot({ tier: { column: 'tier', open: 'o', private: 'p' } })) ?? '',
            /no tier/
        );
        assert.match(
            itemTreeProblem(withRoot({ digests: [{ ...digest, column: 'a b' }] })) ?? '',
            /plain SQL identifier/
        );
    });
});
