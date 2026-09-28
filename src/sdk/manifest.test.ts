import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';

import {
    externalDescriptorOf,
    resolveExtras,
    validateManifest,
    type FeatureManifest
} from './manifest';

const base: FeatureManifest = {
    id: 'x-demo',
    label: 'Demo',
    description: 'A demo module.',
    icon: 'x-demo-icon',
    category: 'daily',
    notifies: false,
    hasItems: false,
    shareTier: 'never',
    resources: ['x-demo.state'],
    commands: [{ command: 'x-demo.get', input: z.object({}), output: z.object({}) }]
};

test('validateManifest accepts a minimal external manifest', () => {
    assert.doesNotThrow(() => validateManifest(base));
});

test('validateManifest lets an external module with items share them', () => {
    assert.doesNotThrow(() =>
        validateManifest({ ...base, hasItems: true, itemNoun: 'pack', shareTier: 'open' })
    );
});

test('validateManifest rejects the classic mistakes', () => {
    const rejects = (patch: Partial<FeatureManifest>, fragment: string) =>
        assert.throws(() => validateManifest({ ...base, ...patch }), new RegExp(fragment));
    rejects({ label: '  ' }, 'empty label');
    rejects({ hasItems: true }, 'itemNoun');
    rejects({ shareTier: 'open' }, 'requires hasItems');
    rejects({ commandPrefix: 'x-demo.' }, 'commandPrefix');
    rejects(
        { commands: [{ command: 'other.get', input: z.object({}), output: z.object({}) }] },
        'x-demo'
    );
});

test('externalDescriptorOf projects the identity fields only, and refuses a native id', () => {
    assert.deepEqual(
        externalDescriptorOf({
            ...base,
            itemNoun: 'thing',
            itemNounGender: 'f',
            sources: { hint: 'keys' },
            notifies: true,
            notifications: { hint: 'on every booking' }
        }),
        {
            id: 'x-demo',
            label: 'Demo',
            description: 'A demo module.',
            icon: 'x-demo-icon',
            notifies: true,
            hasItems: false,
            itemNoun: 'thing',
            itemNounGender: 'f',
            sources: { hint: 'keys' },
            notifications: { hint: 'on every booking' },
            shareTier: 'never'
        }
    );
    assert.throws(() => externalDescriptorOf({ ...base, id: 'weather' }), /not an external id/);
});

test('resolveExtras: the owner holds everything, a member what the grant says, unknown keys nothing', () => {
    const specs: FeatureManifest['extraPermissions'] = [
        { key: 'reset', type: 'toggle', label: 'Reset', description: '' },
        {
            key: 'limit',
            type: 'choice',
            label: 'Limit',
            description: '',
            options: [
                { value: 'low', label: 'Low' },
                { value: 'high', label: 'High' }
            ],
            default: 'low',
            ownerValue: 'high'
        }
    ];
    const owner = resolveExtras(specs, true, {});
    assert.equal(owner.canExtra('reset'), true);
    assert.equal(owner.extraValue('limit'), 'high');

    const member = resolveExtras(specs, false, { reset: true, limit: 'high' });
    assert.equal(member.canExtra('reset'), true);
    assert.equal(member.extraValue('limit'), 'high');

    const restricted = resolveExtras(specs, false, { reset: false, limit: 'bogus' });
    assert.equal(restricted.canExtra('reset'), false);
    assert.equal(
        restricted.extraValue('limit'),
        'low',
        'a value outside the options falls back to the default'
    );

    // Wrong kind or undeclared: nothing, owner or not.
    assert.equal(owner.canExtra('limit'), false);
    assert.equal(owner.extraValue('reset'), '');
    assert.equal(resolveExtras(undefined, true, { reset: true }).canExtra('reset'), false);
});

test('validateManifest ties the domains tab to the domains field', () => {
    const domains = { hint: 'Your own names.', service: 'Point the name here.' };
    assert.doesNotThrow(() =>
        validateManifest({ ...base, domains, settings: { feature: ['domains'] } })
    );
    assert.throws(
        () => validateManifest({ ...base, settings: { feature: ['domains'] } }),
        /domains tab requires domains/
    );
    assert.throws(
        () =>
            validateManifest({
                ...base,
                hasItems: true,
                itemNoun: 'thing',
                domains,
                settings: { item: ['domains'] }
            }),
        /feature-scope/
    );
    assert.throws(
        () => validateManifest({ ...base, domains: { ...domains, service: ' ' } }),
        /empty service/
    );
});

test('validateManifest refuses a tab id it does not know', () => {
    assert.throws(
        () => validateManifest({ ...base, settings: { feature: ['nope' as 'general'] } }),
        /unknown settings tab/
    );
});

test('validateManifest checks quotas and the account entry', () => {
    const rejects = (patch: Partial<FeatureManifest>, fragment: string) =>
        assert.throws(() => validateManifest({ ...base, ...patch }), new RegExp(fragment));
    assert.doesNotThrow(() =>
        validateManifest({
            ...base,
            quotas: [{ key: 'monitors', label: 'monitors' }],
            accountEntry: { label: 'Subscription' },
            accountOnly: true
        })
    );
    rejects({ quotas: [{ key: 'Bad key', label: 'x' }] }, 'invalid quota key');
    rejects(
        {
            quotas: [
                { key: 'monitors', label: 'a' },
                { key: 'monitors', label: 'b' }
            ]
        },
        'duplicate quota key'
    );
    rejects({ quotas: [{ key: 'monitors', label: ' ' }] }, 'empty label');
    assert.doesNotThrow(() =>
        validateManifest({ ...base, quotas: [{ key: 'monitors', label: 'm', stock: true }] })
    );
    rejects(
        { quotas: [{ key: 'storage', label: 'of storage', unit: 'bytes', stock: true }] },
        'a stock counts things'
    );
    assert.doesNotThrow(() =>
        validateManifest({
            ...base,
            quotas: [{ key: 'fileBytes', label: 'm', unit: 'bytes', perOperation: true }]
        })
    );
    rejects(
        { quotas: [{ key: 'monitors', label: 'm', stock: true, perOperation: true }] },
        'a per-operation limit is no stock'
    );
    rejects({ accountOnly: true }, 'accountOnly requires accountEntry');
    rejects({ accountOnly: true, accountEntry: { label: 'S' }, tile: {} }, 'no tile');
    rejects({ accountEntry: { label: ' ' } }, 'requires a label');
});

test('a notifying manifest says when it notifies, and only then', () => {
    const rejects = (patch: Partial<FeatureManifest>, fragment: string) =>
        assert.throws(() => validateManifest({ ...base, ...patch }), new RegExp(fragment));
    assert.doesNotThrow(() =>
        validateManifest({
            ...base,
            notifies: true,
            notifications: { hint: 'Sent when a booking is made.' }
        })
    );
    rejects({ notifies: true }, 'notifies requires notifications.hint');
    rejects(
        { notifies: true, notifications: { hint: '  ' } },
        'notifies requires notifications.hint'
    );
    rejects({ notifications: { hint: 'Sent when…' } }, 'without notifies');
});
