import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';

import {
    createTestContext,
    createTestDomainsContext,
    createTestServiceDeps,
    testDevice,
    testDomain
} from './testing';

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
        devices: [testDevice({ id: 'd1', name: 'One', online: false })]
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

test('the harness searches accounts like the app: substring, exact id first, capped', async () => {
    const account = (id: number, username: string) => ({
        id,
        username,
        email: `${username}@example.com`,
        isAdmin: false,
        created: 0
    });
    const { accounts } = createTestServiceDeps({
        accounts: [account(7, 'zoe'), account(12, 'Alice'), account(3, 'bob12')]
    });
    const ids = async (query: string, limit?: number) =>
        (await accounts.search(query, limit)).map((a) => a.id);

    assert.deepEqual(await ids('  '), [12, 3, 7], 'an empty query lists by username');
    assert.deepEqual(await ids('aLiCe@EXAMPLE'), [12]);
    assert.deepEqual(await ids('12'), [12, 3], 'the exact id comes before a substring hit');
    assert.deepEqual(await ids('12abc'), []);
    assert.deepEqual(await ids('', 1), [12]);
    assert.equal((await ids('', 0)).length, 1, 'a limit below one is raised to one');
});

test('the harness scopes domains to the workspace, and finds a host whatever its spelling', async () => {
    const domains = [
        testDomain({ id: 1, host: 'a.example.com' }),
        testDomain({ id: 2, host: 'b.example.com', verified: false, verifiedAt: null }),
        testDomain({ id: 3, host: 'c.example.com', workspaceId: 2 })
    ];
    const ctx = createTestContext({ domains });
    assert.deepEqual(
        (await ctx.domains.list()).map((d) => d.id),
        [1, 2]
    );
    assert.deepEqual(
        (await ctx.domains.verified()).map((d) => d.id),
        [1]
    );
    assert.equal(await ctx.domains.get(3), null, 'another workspace');

    const deps = createTestServiceDeps({ domains });
    assert.equal((await deps.domains.findByHost('C.Example.com:443.'))?.id, 3);
    assert.equal(await deps.domains.findByHost('nope.example.com'), null);

    const hooks = createTestDomainsContext({ dns: { txt: () => Promise.resolve(['v=spf1']) } });
    assert.deepEqual(await hooks.dns.txt('x'), ['v=spf1']);
    assert.deepEqual(await hooks.dns.mx('x'), []);
});

test('the harness bounds a quota like the app: never counted when unlimited, refused past the limit', async () => {
    let counted = 0;
    const count = (ids: readonly number[]) => {
        counted++;
        return Promise.resolve(ids.length + 2);
    };
    const free = createTestContext();
    await free.quota.assert('monitors', count);
    assert.equal(counted, 0);

    const bounded = createTestContext({ quotaLimits: { monitors: 3 }, ownerWorkspaceIds: [1, 2] });
    await assert.rejects(bounded.quota.assert('monitors', count), /quota/);
    await createTestContext({
        quotaLimits: { monitors: 4 },
        ownerWorkspaceIds: [1, 2]
    }).quota.assert('monitors', count);
    assert.equal(await bounded.quota.limit('monitors'), 3);

    bounded.live.accountChanged(7);
    assert.deepEqual(bounded.recorded.accountChanges, [7]);
});

test('the harnesses hold the plan pauses and refuse a paused item on demand', async () => {
    const ctx = createTestContext({ pausedItems: { monitors: ['7'] } });
    assert.equal(ctx.quota.isPaused('monitors', '7'), true);
    assert.equal(ctx.quota.isPaused('monitors', '8'), false);
    assert.deepEqual(ctx.quota.paused('monitors'), ['7']);
    await assert.rejects(ctx.quota.assertActive('monitors', '7'), { code: 'quota_exceeded' });
    await ctx.quota.assertActive('monitors', '8');

    const deps = createTestServiceDeps({ pausedItems: { monitors: ['7'] } });
    assert.equal(deps.pauses.isPaused('monitors', '7'), true);
    assert.deepEqual(deps.quotaFor(1).paused('monitors'), ['7']);
    assert.deepEqual(createTestServiceDeps().pauses.paused('monitors'), []);
});
