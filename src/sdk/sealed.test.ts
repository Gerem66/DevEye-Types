import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sealedColumnsProblem } from './sealed';

const accountExport = { tables: { ft_demo_keys: { skip: 'Key material never leaves.' } } };

test('sealedColumnsProblem accepts a column of a table the module owns', () => {
    assert.equal(
        sealedColumnsProblem({
            accountExport,
            sealed: [{ table: 'ft_demo_keys', column: 'sealed', id: 'id', match: { kind: 'root' } }]
        }),
        null
    );
    assert.equal(sealedColumnsProblem({}), null);
});

test('sealedColumnsProblem refuses a foreign table, a bad name and a column declared twice', () => {
    assert.match(
        sealedColumnsProblem({
            accountExport,
            sealed: [{ table: 'user_2fa', column: 'secret_enc', id: 'user_id' }]
        }) ?? '',
        /user_2fa is not in accountExport\.tables/
    );
    assert.match(
        sealedColumnsProblem({
            accountExport,
            sealed: [
                {
                    table: 'ft_demo_keys',
                    column: 'sealed',
                    id: 'id',
                    match: { 'kind = 1 OR 1': 'x' }
                }
            ]
        }) ?? '',
        /not an identifier/
    );
    const twice = { table: 'ft_demo_keys', column: 'sealed', id: 'id' };
    assert.match(
        sealedColumnsProblem({ accountExport, sealed: [twice, twice] }) ?? '',
        /declared twice/
    );
});
