/**
 * The SSRF guard, in the published package.
 *
 * Any feature that follows a URL a member typed needs it, and a guard written
 * twice is a guard that gets fixed once. It lives here rather than in the app
 * because an external module has no import path into the app: without this, a
 * third-party module either reimplements the ranges or ships no guard at all.
 *
 * The predicates do no I/O: a hostname is NOT resolved. DNS would change under
 * the caller's feet between the check and the connection anyway, so the answer
 * is about the URL, and a caller that must also bound the address it finally
 * connects to has to say so at connection time. `safeFetchText` is the one
 * fetch built on them, for a small text body (a domain's proof, a calendar).
 */
import { resolve4, resolve6 } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

/**
 * Every address that is not public, in both families: loopback, private
 * ranges, link-local, CGNAT, multicast and reserved, and the IPv4-compatible
 * `::/96` (which holds `::` and `::1`).
 */
const NON_PUBLIC = new BlockList();
for (const [net, prefix] of [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.168.0.0', 16],
    ['224.0.0.0', 3]
] as const) {
    NON_PUBLIC.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
    ['::', 96],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8]
] as const) {
    NON_PUBLIC.addSubnet(net, prefix, 'ipv6');
}

/**
 * Is this a public, routable IP address? Loopback, private ranges, link-local,
 * CGNAT and multicast all read as false, in both families. An IPv4 address
 * written in IPv6 (`::ffff:7f00:1`, the form a URL parser gives back) is judged
 * on its IPv4 part: `BlockList.check` matches it against the IPv4 rules.
 */
export function isPublicIp(raw: string): boolean {
    const ip = raw.replace(/^\[|\]$/g, '');
    const family = isIP(ip);
    if (family === 0) return false;
    return !NON_PUBLIC.check(ip, family === 4 ? 'ipv4' : 'ipv6');
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

const MAX_REDIRECTS = 3;

/** What `safeFetchText` throws for anything it refuses, its message readable as is. */
export class NetRefused extends Error {}

/** Socket and TLS codes that put the fault at the far end of a connection. */
const REMOTE_FAILURE_CODES = new Set([
    'ENOTFOUND',
    'ENODATA',
    'ECONNREFUSED',
    'ECONNRESET',
    'ECONNABORTED',
    'ETIMEDOUT',
    'ESOCKETTIMEDOUT',
    'EHOSTUNREACH',
    'EPIPE',
    'ERR_STREAM_PREMATURE_CLOSE',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
    'UND_ERR_SOCKET',
    'CERT_HAS_EXPIRED',
    'CERT_NOT_YET_VALID',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    'ERR_TLS_CERT_ALTNAME_INVALID'
]);

/**
 * Did this failure come from the other end: a name that does not resolve, a
 * connection refused, reset or left silent, a certificate that does not hold,
 * a peer that hung up mid-transfer, or a {@link NetRefused} refusal? Walks the
 * `cause` chain, where `fetch` hides the socket error. A resolver that answers
 * nothing (`EAI_AGAIN`) or a network the instance cannot reach stays the
 * instance's, as does anything unrecognised.
 */
export function isRemoteFailure(error: unknown): boolean {
    let current: unknown = error;
    for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth += 1) {
        if (current instanceof NetRefused) return true;
        const { name, code, cause } = current as {
            name?: unknown;
            code?: unknown;
            cause?: unknown;
        };
        if (name === 'TimeoutError') return true;
        if (typeof code === 'string' && REMOTE_FAILURE_CODES.has(code)) return true;
        current = cause;
    }
    return false;
}

/** Do all the addresses of a name read as public? A name without any address is refused. */
export async function resolvesPublicly(host: string): Promise<boolean> {
    const bare = host.replace(/^\[|\]$/g, '');
    if (isIP(bare) !== 0) return isPublicIp(bare);
    const found: string[] = [];
    for (const lookup of [resolve4(host), resolve6(host)]) {
        try {
            found.push(...(await lookup));
        } catch {
            // One family missing is not an error; both missing is.
        }
    }
    return found.length > 0 && found.every((address) => isPublicIp(address));
}

export interface SafeFetchOptions {
    /** The read stops beyond it: a hostile server does not fill the memory. */
    maxBytes: number;
    timeoutMs: number;
    /** Required of the final response, as a prefix. Omitted: anything. */
    contentType?: string;
    accept?: string;
    userAgent?: string;
    /** Extra request headers (an API key the service expects); `accept` and `user-agent` above win. */
    headers?: Readonly<Record<string, string>>;
}

/**
 * Fetches a text body, refusing anything off the public network: the URL,
 * every address its name resolves to, and the same again at each redirect.
 * Rebinding between the resolution and the connection stays possible with a
 * bare `fetch`: fine for a token you compare, which is why the body is capped.
 */
export async function safeFetchText(raw: string, options: SafeFetchOptions): Promise<string> {
    let target = raw;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        if (!isSafePublicUrl(target)) {
            throw new NetRefused('Adresse refusée : elle n’est pas publique.');
        }
        const url = new URL(target);
        if (!(await resolvesPublicly(url.hostname))) {
            throw new NetRefused('Adresse refusée : elle ne résout pas vers une adresse publique.');
        }

        const response = await fetch(url, {
            redirect: 'manual',
            signal: AbortSignal.timeout(options.timeoutMs),
            headers: {
                ...options.headers,
                accept: options.accept ?? 'text/plain, */*',
                'user-agent': options.userAgent ?? 'DevEye/1.0'
            }
        });

        if (response.status >= 300 && response.status < 400) {
            const next = response.headers.get('location');
            if (next === null) throw new NetRefused('Redirection sans destination.');
            target = new URL(next, url).toString();
            continue;
        }
        if (!response.ok) throw new NetRefused(`Réponse ${response.status}`);

        const kind = (response.headers.get('content-type') ?? '').toLowerCase();
        if (options.contentType !== undefined && !kind.startsWith(options.contentType)) {
            throw new NetRefused(`Type inattendu : ${kind.split(';')[0] || 'aucun'}`);
        }
        return readBounded(response, options.maxBytes);
    }
    throw new NetRefused('Trop de redirections.');
}

async function readBounded(response: Response, maxBytes: number): Promise<string> {
    const body = response.body;
    if (body === null) return '';

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
            await reader.cancel();
            throw new NetRefused(
                `Réponse trop longue (plus de ${Math.round(maxBytes / 1024)} ko).`
            );
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
}
