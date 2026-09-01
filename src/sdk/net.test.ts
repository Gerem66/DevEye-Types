import assert from 'node:assert/strict';
import test from 'node:test';

import { isPublicIp, isSafePublicUrl } from './net';

test('isPublicIp: the private ranges of both families read as false', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '2001:4860:4860::8888']) {
        assert.equal(isPublicIp(ip), true, ip);
    }
    for (const ip of [
        '127.0.0.1',
        '10.0.0.1',
        '172.16.0.1',
        '172.31.255.255',
        '192.168.1.1',
        '169.254.169.254',
        '100.64.0.1',
        '0.0.0.0',
        '224.0.0.1',
        '::1',
        'fd00::1',
        'fe80::1',
        // IPv4-mapped: judged on the v4 part, not on the v6 prefix.
        '::ffff:127.0.0.1',
        'not-an-ip'
    ]) {
        assert.equal(isPublicIp(ip), false, ip);
    }
});

test('isSafePublicUrl: only public http(s) hosts, string or URL', () => {
    assert.equal(isSafePublicUrl('https://github.com/owner/repo.git'), true);
    assert.equal(isSafePublicUrl(new URL('http://example.com')), true);

    for (const url of [
        'http://localhost:3000',
        'https://db.internal/x',
        'https://printer.local',
        'https://app.localhost',
        'http://192.168.1.10/admin',
        'http://[::1]:8080',
        // Anything but http(s): a git `ext::` or a `file://` would run a
        // command or read the server's disk.
        'file:///etc/passwd',
        'ext::sh -c whoami',
        'ssh://git@github.com/owner/repo.git',
        'not a url at all'
    ]) {
        assert.equal(isSafePublicUrl(url), false, url);
    }
});
