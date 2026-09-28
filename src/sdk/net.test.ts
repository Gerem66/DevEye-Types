import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import test from 'node:test';

import { isPublicIp, isSafePublicUrl, NetRefused, safeFetchText } from './net';

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

const OPTIONS = { maxBytes: 1024, timeoutMs: 2000 };

async function listening(
    handler: Parameters<typeof createServer>[1]
): Promise<{ url: string; close: () => void }> {
    const server: Server = createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;
    return { url: `http://127.0.0.1:${port}`, close: () => server.close() };
}

test('safeFetchText: a loopback server is refused before any connection', async () => {
    let touched = false;
    const server = await listening((_req, res) => {
        touched = true;
        res.end('token');
    });
    try {
        await assert.rejects(safeFetchText(server.url, OPTIONS), NetRefused);
        assert.equal(touched, false);
    } finally {
        server.close();
    }
});

test('safeFetchText: other schemes, names that do not resolve and private IPs are refused', async () => {
    for (const url of [
        'file:///etc/passwd',
        'gopher://example.com',
        'ftp://example.com/a',
        'https://this-name-does-not-exist.invalid/a.ics',
        'http://169.254.169.254/latest/meta-data/',
        'http://10.0.0.1/',
        'http://[::1]/'
    ]) {
        await assert.rejects(safeFetchText(url, OPTIONS), NetRefused, url);
    }
});
