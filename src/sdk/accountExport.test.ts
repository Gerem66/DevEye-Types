import assert from 'node:assert/strict';
import { test } from 'node:test';

import { accountExportProblem, exportTableRows, type SdkExportTable } from './accountExport';
import type { SdkQueryable } from './server';

const spec: SdkExportTable = { file: 'notes.json', where: 'workspace_id = ?', key: ['id'] };

test('accountExportProblem accepts a sound declaration and names what is wrong', () => {
    assert.equal(
        accountExportProblem({
            tables: {
                notes: { ...spec, sealed: ['content'], json: ['content'], omit: ['secret_enc'] },
                note_cache: { skip: 'Un cache, reconstruit par la synchronisation.' },
                notes_links: 'custom'
            },
            store: { omit: ['apiKey'] }
        }),
        null
    );
    const problem = (tables: Record<string, unknown>) =>
        accountExportProblem({ tables: tables as never });
    assert.match(problem({ 'bad name': spec }) ?? '', /not an identifier/);
    assert.match(problem({ a: { skip: ' ' } }) ?? '', /a skip says why/);
    assert.match(problem({ a: { ...spec, file: 'Notes.JSON' } }) ?? '', /file/);
    assert.match(problem({ a: spec, b: spec }) ?? '', /write the same file/);
    assert.equal(problem({ a: spec, b: { ...spec, scope: 'account' } }), null);
    assert.match(problem({ a: { ...spec, where: 'a = ? AND b = ?' } }) ?? '', /exactly one \?/);
    assert.match(problem({ a: { ...spec, where: 'a = ?; DROP TABLE x' } }) ?? '', /holds a ;/);
    assert.match(
        problem({ a: { ...spec, sealed: ['x'], omit: ['x'] } }) ?? '',
        /both sealed and omitted/
    );
});

function fakeTable(rows: Record<string, unknown>[]): { q: SdkQueryable; sql: string[] } {
    const sql: string[] = [];
    const q: SdkQueryable = {
        async query<T extends object>(text: string, params: unknown[] = []): Promise<T[]> {
            sql.push(text);
            const after = params.length > 1 ? Number(params[1]) : -Infinity;
            const limit = Number(/LIMIT (\d+)/.exec(text)?.[1]);
            return rows.filter((r) => Number(r.id) > after).slice(0, limit) as T[];
        },
        async execute() {
            return { affectedRows: 0, insertId: 0 };
        }
    };
    return { q, sql };
}

test('exportTableRows pages by key, opens sealed cells, and never lets an omitted column out', async () => {
    const rows = Array.from({ length: 450 }, (_, i) => ({
        id: i + 1,
        workspace_id: 3,
        content: i === 7 ? 'broken' : `sealed:${JSON.stringify({ n: i })}`,
        secret_enc: 'nope',
        created: 1_790_000_000,
        big: BigInt('12345678901234567890'),
        raw: Buffer.from('hi')
    }));
    const { q, sql } = fakeTable(rows);
    let unreadable = 0;
    const out: Record<string, unknown>[] = [];
    for await (const row of exportTableRows(
        q,
        'notes',
        {
            ...spec,
            sealed: ['content'],
            json: ['content'],
            omit: ['secret_enc'],
            dates: { created: 's' }
        },
        3,
        async (blob) => (blob.startsWith('sealed:') ? blob.slice(7) : null),
        () => unreadable++
    )) {
        out.push(row);
    }
    assert.equal(out.length, 450);
    assert.deepEqual(out[0], {
        id: 1,
        workspace_id: 3,
        content: { n: 0 },
        created: new Date(1_790_000_000_000).toISOString(),
        big: '12345678901234567890',
        raw: { base64: Buffer.from('hi').toString('base64') }
    });
    assert.equal(out[7].content, null);
    assert.equal(unreadable, 1);
    assert.ok(sql.length >= 2, 'several pages');
    assert.match(
        sql[0],
        /^SELECT \* FROM `notes` WHERE \(workspace_id = \?\) ORDER BY `id` LIMIT 200$/
    );
    assert.match(sql[1], /AND \(`id`\) > \(\?\)/);
});
