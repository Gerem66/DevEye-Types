import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';

import { createTestContext, createTestServiceDeps } from './testing';

test('createTestContext follows the manifest for extras, and records what handlers do', async () => {
    const manifest = {
        extraPermissions: [
            { key: 'reset', type: 'toggle' as const, label: 'Reset', description: '' }
        ]
    };
    const member = createTestContext({ manifest, isOwner: false, extras: { reset: true } });
    assert.equal(member.canExtra('reset'), true);
    assert.equal(createTestContext({ manifest, isOwner: false }).canExtra('reset'), false);
    assert.equal(
        createTestContext({ isOwner: true }).canExtra('reset'),
        false,
        'no manifest, no extra'
    );

    await member.deveye.notify.send({ subject: 's', body: 'b' }, { itemId: 3 });
    member.audit({ action: 'x.did', description: 'did' });
    assert.deepEqual(member.recorded.notifications, [{ subject: 's', body: 'b', itemId: 3 }]);
    assert.deepEqual(member.recorded.audits, [{ action: 'x.did', description: 'did' }]);

    await member.store.putJson(
        'k',
        z.object({ n: z.number() }),
        { n: 1 },
        { encryption: 'private' }
    );
    assert.equal(member.store.rows.get('k')?.mode, 'private');
});

test('createTestServiceDeps: one store per workspace, hand-driven tickers, a wrapper that round-trips', async () => {
    const deps = createTestServiceDeps({
        workspaceIds: [1, 2],
        devices: [{ id: 'd1', name: 'One', online: false }]
    });
    assert.deepEqual(await deps.listWorkspaceIds(), [1, 2]);
    await deps.storeFor(1).put('a', '1');
    assert.equal(await deps.storeFor(2).get('a'), null);
    assert.equal(deps.stores.size, 2);

    let beats = 0;
    const service = deps.createTicker({
        intervalMs: 1000,
        tick: () => Promise.resolve(void beats++)
    });
    await service.start();
    assert.equal(beats, 0, 'a ticker never starts on its own');
    await deps.recorded.tickers[0].tick();
    assert.equal(beats, 1);

    const sealed = deps.keys.sealBytes(new Uint8Array([1, 2, 3]));
    assert.deepEqual(deps.keys.openBytes(sealed), new Uint8Array([1, 2, 3]));
    assert.equal(deps.keys.openBytes('nope'), null);

    assert.equal(deps.devicesFor(1).isOnline('d1'), false);
    assert.equal((await deps.devicesFor(1).list()).length, 1);
});
