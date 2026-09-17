import { z } from 'zod';

/**
 * A domain name a feature serves under, declared in the feature's settings
 * and verified in two stages: ownership (a TXT record DevEye checks itself),
 * then service (the owning feature's own probe).
 *
 * Host and token travel in the clear: both are published in the DNS.
 */

export const DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV'] as const;

export const dnsRecordSchema = z.object({
    type: z.enum(DNS_RECORD_TYPES),
    /** Fully qualified, without the trailing dot. */
    name: z.string().min(1).max(255),
    value: z.string().min(1).max(4096),
    /** MX and SRV only. */
    priority: z.number().int().nonnegative().optional()
});
export type DnsRecord = z.infer<typeof dnsRecordSchema>;

/** `pending` until the first check has run. */
export const domainStateSchema = z.enum(['pending', 'ok', 'failed']);
export type DomainState = z.infer<typeof domainStateSchema>;

export const FEATURE_DOMAIN_HOST_MAX = 253;

export const featureDomainSchema = z.object({
    id: z.number().int().positive(),
    host: z.string().min(1).max(FEATURE_DOMAIN_HOST_MAX),
    /** The TXT record that proves ownership. */
    ownership: dnsRecordSchema,
    /** What the owning feature asks to publish on top of it. */
    records: z.array(dnsRecordSchema),
    dnsState: domainStateSchema,
    dnsError: z.string(),
    probeState: domainStateSchema,
    probeError: z.string(),
    /** Unix seconds. Null until both stages have passed once. */
    verifiedAt: z.number().int().nullable(),
    checkedAt: z.number().int().nullable(),
    /** How many of the feature's items designate this domain. */
    useCount: z.number().int().nonnegative()
});
export type FeatureDomain = z.infer<typeof featureDomainSchema>;
