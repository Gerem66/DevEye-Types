/**
 * The SSRF guard, in the published package.
 *
 * Any feature that follows a URL a member typed needs it, and a guard written
 * twice is a guard that gets fixed once. It lives here rather than in the app
 * because an external module has no import path into the app: without this, a
 * third-party module either reimplements the ranges or ships no guard at all.
 *
 * Pure predicates, no I/O: a hostname is NOT resolved. DNS would change under
 * the caller's feet between the check and the connection anyway, so the answer
 * is about the URL, and a caller that must also bound the address it finally
 * connects to has to say so at connection time.
 */
import { isIP } from 'node:net';

/**
 * Is this a public, routable IP address? Loopback, private ranges, link-local,
 * CGNAT and multicast all read as false, in both families.
 */
export function isPublicIp(raw: string): boolean {
    const ip = raw.replace(/^\[|\]$/g, '').toLowerCase();
    const v = isIP(ip);
    if (v === 0) return false;

    if (v === 4) return isPublicIpv4(ip);

    // IPv4-mapped or compatible: judge the real v4 part.
    const mapped = ip.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIpv4(mapped[1]);

    if (ip === '::' || ip === '::1') return false;
    // fc00::/7 (unique-local), fe80::/10 (link-local), ff00::/8 (multicast).
    if (/^f[cd]/.test(ip)) return false;
    if (/^fe[89ab]/.test(ip)) return false;
    if (/^ff/.test(ip)) return false;
    return true;
}

function isPublicIpv4(ip: string): boolean {
    const o = ip.split('.').map(Number);
    if (o.length !== 4 || o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    if (o[0] === 0 || o[0] === 10 || o[0] === 127) return false;
    if (o[0] === 169 && o[1] === 254) return false; // link-local
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return false;
    if (o[0] === 192 && o[1] === 168) return false;
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return false; // CGNAT
    if (o[0] >= 224) return false; // multicast and reserved
    return true;
}

/**
 * May the server fetch this URL? Only public http(s) hosts, so a pasted
 * address cannot probe the network the server sits in. Accepts a `URL` or the
 * raw string a user typed, which may not parse at all.
 */
export function isSafePublicUrl(input: URL | string): boolean {
    let u: URL;
    try {
        u = typeof input === 'string' ? new URL(input) : input;
    } catch {
        return false;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (
        h === 'localhost' ||
        h.endsWith('.local') ||
        h.endsWith('.internal') ||
        h.endsWith('.localhost')
    ) {
        return false;
    }
    const bare = h.replace(/^\[|\]$/g, '');
    if (isIP(bare) !== 0) return isPublicIp(bare);
    return true;
}
