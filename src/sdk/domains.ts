/**
 * Domain names a feature serves under: the pure half, shared by the server
 * contract, the app and the test harness. No I/O here.
 */
import type { DnsRecord } from '../domain/featureDomain';

export type SdkDnsRecord = DnsRecord;

/** A bare host name: labels of letters, digits and hyphens, at least two. Punycode passes as is. */
export const DOMAIN_HOST_PATTERN = /^(?=.{1,253}$)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;

/** Lowercase, port and trailing dots dropped. Accepts a raw `Host` header. */
export function normaliseDomainHost(raw: string): string {
    return raw.trim().toLowerCase().split(':')[0].replace(/\.+$/, '');
}

/**
 * The ownership proof DevEye checks itself: `_deveye.<host>` holding
 * `deveye-<slug>=<token>`, the slug being the feature id without its `x-`.
 * Several features can prove the same host: each adds its own value.
 */
export function domainOwnershipRecord(
    featureId: string,
    host: string,
    token: string
): SdkDnsRecord {
    const slug = featureId.replace(/^x-/, '');
    return { type: 'TXT', name: `_deveye.${host}`, value: `deveye-${slug}=${token}` };
}
