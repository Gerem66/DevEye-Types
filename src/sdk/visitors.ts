/**
 * What a public route may learn about a visitor without keeping anything that
 * identifies them: the kind of browser, whether it is a robot, where it came
 * from, and a daily fingerprint that counts people without recognising them.
 *
 * Pure: no database, no network, no clock. These rules decide whether two
 * visits count as one person, and a mistake here shows as wrong figures, never
 * as an outage.
 */
import { createHash } from 'node:crypto';

/** Browser, system and kind of device, and nothing more: the rest only slices an audience into useless pieces. */
export interface UserAgentInfo {
    /** `null` when unrecognised: name it in your own words (`'Other'`). */
    browser: string | null;
    /** `null` when unrecognised. */
    os: string | null;
    /** Three values, not a taxonomy. */
    device: 'desktop' | 'mobile' | 'tablet';
}

// The order of the tests is the point: these strings lie by inheritance (Edge
// says "Chrome", Chrome says "Safari"). From the most specific to the most
// general; reordering breaks detection without breaking a type.
function detectBrowser(ua: string): string | null {
    if (/\bEdg[A-Z]?\//.test(ua)) return 'Edge';
    if (/\bOPR\/|\bOpera\b/.test(ua)) return 'Opera';
    if (/\bSamsungBrowser\//.test(ua)) return 'Samsung Internet';
    if (/\bVivaldi\//.test(ua)) return 'Vivaldi';
    if (/\bBrave\//.test(ua)) return 'Brave';
    if (/\bChrome\/|\bCriOS\//.test(ua)) return 'Chrome';
    if (/\bFirefox\/|\bFxiOS\//.test(ua)) return 'Firefox';
    if (/\bSafari\//.test(ua)) return 'Safari';
    return null;
}

function detectOs(ua: string): string | null {
    // Android before Linux: every Android is a Linux and says so.
    if (/\bAndroid\b/.test(ua)) return 'Android';
    // iPadOS 13+ claims to be a Macintosh; `detectDevice` catches it.
    if (/\biPhone\b|\biPad\b|\biPod\b/.test(ua)) return 'iOS';
    if (/\bWindows NT\b/.test(ua)) return 'Windows';
    if (/\bMac OS X\b|\bMacintosh\b/.test(ua)) return 'macOS';
    if (/\bCrOS\b/.test(ua)) return 'ChromeOS';
    if (/\bLinux\b|\bX11\b/.test(ua)) return 'Linux';
    return null;
}

function detectDevice(ua: string): UserAgentInfo['device'] {
    if (/\biPad\b/.test(ua)) return 'tablet';
    // An Android without "Mobile" is a tablet: Google's convention, and the
    // only distinction the string carries.
    if (/\bAndroid\b/.test(ua) && !/\bMobile\b/.test(ua)) return 'tablet';
    if (/\bTablet\b/i.test(ua)) return 'tablet';
    if (/\bMobi\b|\bMobile\b|\biPhone\b|\biPod\b/.test(ua)) return 'mobile';
    return 'desktop';
}

/** An empty string reads as unknown everywhere, which is the truth, not an error. */
export function parseUserAgent(raw: string | undefined): UserAgentInfo {
    const ua = (raw ?? '').trim();
    if (!ua) return { browser: null, os: null, device: 'desktop' };
    return { browser: detectBrowser(ua), os: detectOs(ua), device: detectDevice(ua) };
}

/**
 * Known robots, kept out of the figures: a search engine passing six times a
 * day doubles the numbers of a quiet page. Deliberately coarse, it only
 * catches what announces itself; the one defence against disguised ones would
 * be a browser fingerprint, which counting without consent rules out.
 */
const BOT_PATTERN = new RegExp(
    [
        'bot\\b',
        'crawler',
        'spider',
        'slurp',
        'facebookexternalhit',
        'preview',
        'monitor',
        'curl/',
        'wget/',
        'python-',
        'headless'
    ].join('|'),
    'i'
);

export function looksLikeBot(raw: string | undefined): boolean {
    if (!raw) return false;
    return BOT_PATTERN.test(raw);
}

/**
 * The host of an origin, whatever form it came in: `https://example.com`,
 * `example.com:443` and `EXAMPLE.COM/` all read `example.com`. One canonical
 * form on both sides of a comparison (a setting typed by a member, an `Origin`
 * header). The port goes, except in an IPv6 literal where colons are the
 * address itself. Unlike `normaliseDomainHost`, any URL is accepted.
 */
export function originHost(raw: string): string {
    let value = raw.trim().toLowerCase();
    if (!value) return '';
    value = value.replace(/^[a-z]+:\/\//, '');
    value = value.split('/')[0].split('?')[0].split('#')[0];
    if (!value.startsWith('[')) value = value.split(':')[0];
    return value;
}

/**
 * Where the visitor came from: the host alone, never the full URL, which would
 * quietly collect personal addresses. A visit from one of `ownHosts` gives no
 * referrer, or the first of any ranking would always be the site itself.
 */
export function normalizeReferrer(
    raw: string | undefined,
    ownHosts: readonly string[],
    maxLength: number
): string | null {
    if (!raw) return null;
    const host = originHost(raw);
    if (!host) return null;
    if (ownHosts.includes(host)) return null;
    return host.slice(0, maxLength);
}

/**
 * A visitor's fingerprint: `salt + scope + ip + user agent`, truncated. Neither
 * the address nor the user agent is kept; they go in here and never come out.
 * With a salt that changes every day, the same person cannot be recognised
 * from one day to the next: the price of counting without consent. `scope`
 * (a site key, a link id) keeps one person from carrying the same fingerprint
 * on two of them, so they cannot be crossed.
 */
export function visitorRef(salt: string, scope: string, ip: string, userAgent: string): string {
    return createHash('sha256')
        .update(salt)
        .update(' ')
        .update(scope)
        .update(' ')
        .update(ip)
        .update(' ')
        .update(userAgent)
        .digest('hex')
        .slice(0, 16);
}
