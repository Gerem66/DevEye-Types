import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    countMovableCells,
    FeatureError,
    resealCells,
    type MovableCell,
    type SdkCipher,
    type SdkQueryable
} from './server';

/**
 * Le rescellement d'un élément qui change d'espace. Ce qui se vérifie ici est
 * ce qui ne pardonne pas : une seule cellule illisible doit tout annuler AVANT
 * la première écriture, un arbre à moitié converti étant définitivement illisible
 * sans que rien puisse le détecter.
 */

interface Row {
    row_id: number;
    value: string;
}

/**
 * Un queryable qui ne comprend du SQL que la table et la colonne lues, et qui
 * retient ce qu'on a tenté d'écrire.
 */
function fakeQ(cells: Record<string, Row[]>) {
    const writes: { sql: string; params: unknown[] }[] = [];
    const q: SdkQueryable = {
        query: async <T extends object>(sql: string, params?: unknown[]) => {
            void params;
            const count = /SELECT COUNT\(\*\) AS n FROM (\w+)\s+WHERE (\w+)/.exec(sql);
            if (count) {
                return [
                    { n: (cells[`${count[1]}.${columnOf(sql)}`] ?? []).length }
                ] as unknown as T[];
            }
            const read = /AS row_id, (\w+) AS value\s+FROM (\w+)/.exec(sql);
            return (read ? (cells[`${read[2]}.${read[1]}`] ?? []) : []) as unknown as T[];
        },
        execute: async (sql: string, params?: unknown[]) => {
            writes.push({ sql, params: params ?? [] });
            return { affectedRows: 1, insertId: 0 };
        }
    };
    return { q, writes };
}

/** La colonne d'un COUNT, que le SQL ne nomme que dans son `WHERE`. */
function columnOf(sql: string): string {
    return /AND (\w+) IS NOT NULL/.exec(sql)?.[1] ?? '';
}

function cipherOf(tag: string): SdkCipher {
    return {
        encrypt: async (plain) => `${tag}:${plain}`,
        decrypt: async (blob) => blob.slice(tag.length + 1),
        tryDecrypt: async (blob) => (blob.startsWith(`${tag}:`) ? blob.slice(tag.length + 1) : null)
    };
}

const ciphers = { from: cipherOf('A'), to: cipherOf('B') };

const CELLS: MovableCell[] = [
    { table: 'ft_x_items', idColumn: 'id', ownerColumn: 'id', column: 'content' },
    { table: 'ft_x_children', idColumn: 'id', ownerColumn: 'item_id', column: 'body' }
];

describe('resealCells', () => {
    it('rescelle chaque cellule sous la clé cible, la garde du propriétaire comprise', async () => {
        const { q, writes } = fakeQ({
            'ft_x_items.content': [{ row_id: 7, value: 'A:corps' }],
            'ft_x_children.body': [
                { row_id: 1, value: 'A:un' },
                { row_id: 2, value: 'A:deux' }
            ]
        });

        assert.equal(await resealCells(q, CELLS, 7, ciphers), 3);
        assert.deepEqual(
            writes.map((w) => w.params),
            [
                ['B:corps', 7, 7],
                ['B:un', 1, 7],
                ['B:deux', 2, 7]
            ]
        );
        // La ligne se cible par son identifiant ET son propriétaire : une
        // conversion ne peut pas déborder sur un voisin.
        assert.match(writes[1]!.sql, /WHERE id = \? AND item_id = \?/);
    });

    it('annule tout sur une cellule illisible, sans avoir écrit une seule ligne', async () => {
        const { q, writes } = fakeQ({
            'ft_x_items.content': [{ row_id: 7, value: 'A:corps' }],
            // Scellée sous une troisième clé : la conversion doit renoncer.
            'ft_x_children.body': [{ row_id: 1, value: 'Z:perdu' }]
        });

        await assert.rejects(
            resealCells(q, CELLS, 7, ciphers),
            (err: unknown) => err instanceof FeatureError && /illisible/.test(err.message)
        );
        assert.equal(writes.length, 0);
    });

    it('suit un sous-parcours pour une ligne qui pend indirectement', async () => {
        const indirect: MovableCell[] = [
            {
                table: 'ft_x_leaves',
                idColumn: 'id',
                ownerColumn: 'child_id',
                ownerScope: 'SELECT id FROM ft_x_children WHERE item_id = ?',
                column: 'body'
            }
        ];
        const { q, writes } = fakeQ({ 'ft_x_leaves.body': [{ row_id: 5, value: 'A:feuille' }] });

        await resealCells(q, indirect, 7, ciphers);
        assert.match(
            writes[0]!.sql,
            /WHERE id = \? AND child_id IN \(SELECT id FROM ft_x_children WHERE item_id = \?\)/
        );
        assert.deepEqual(writes[0]!.params, ['B:feuille', 5, 7]);
    });

    it('compte ce qu’il y aurait à convertir sans rien convertir', async () => {
        const { q, writes } = fakeQ({
            'ft_x_items.content': [{ row_id: 7, value: 'A:corps' }],
            'ft_x_children.body': [
                { row_id: 1, value: 'A:un' },
                { row_id: 2, value: 'A:deux' }
            ]
        });
        assert.equal(await countMovableCells(q, CELLS, 7), 3);
        assert.equal(writes.length, 0);
    });
});
