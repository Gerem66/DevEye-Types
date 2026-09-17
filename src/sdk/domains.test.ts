import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DOMAIN_HOST_PATTERN, domainOwnershipRecord, normaliseDomainHost } from './domains';

test('normaliseDomainHost drops case, port and trailing dots', () => {
    assert.equal(normaliseDomainHost(' Rdv.Example.COM:8443 '), 'rdv.example.com');
    assert.equal(normaliseDomainHost('example.com..'), 'example.com');
});

test('DOMAIN_HOST_PATTERN wants at least two plain labels', () => {
    assert.ok(DOMAIN_HOST_PATTERN.test('mail.example.com'));
    assert.ok(DOMAIN_HOST_PATTERN.test('xn--bcher-kva.example'));
    assert.ok(!DOMAIN_HOST_PATTERN.test('localhost'));
    assert.ok(!DOMAIN_HOST_PATTERN.test('exa mple.com'));
    assert.ok(!DOMAIN_HOST_PATTERN.test('https://example.com'));
    assert.ok(!DOMAIN_HOST_PATTERN.test(`${'a'.repeat(64)}.com`));
});

test('the ownership record names the feature by its slug', () => {
    assert.deepEqual(domainOwnershipRecord('x-rdv', 'example.com', 'abc'), {
        type: 'TXT',
        name: '_deveye.example.com',
        value: 'deveye-rdv=abc'
    });
    assert.equal(
        domainOwnershipRecord('mailserver', 'example.com', 'abc').value,
        'deveye-mailserver=abc'
    );
});
