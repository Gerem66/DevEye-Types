import { z } from 'zod';

/**
 * An external dependency of the instance (a payment provider, an object store,
 * a third-party API) as the administrator's "Services externes" page shows it.
 * Services set up by each workspace (its own webhook, its own API key) are not
 * the instance's and never appear there.
 */

/** `inactive`: not configured on this instance, on purpose or not yet. */
export const externalServiceStateSchema = z.enum(['ok', 'degraded', 'down', 'inactive']);
export type ExternalServiceState = z.infer<typeof externalServiceStateSchema>;

/** One "label: value" line of a service's card. */
export const externalServiceFactSchema = z.object({
    label: z.string().min(1),
    value: z.string(),
    tone: z.enum(['success', 'warning', 'danger']).optional()
});
export type ExternalServiceFact = z.infer<typeof externalServiceFactSchema>;

/** A gauge: `used` out of `limit`, in bytes or as a plain count. */
export const externalServiceMeterSchema = z.object({
    label: z.string().min(1),
    used: z.number().nonnegative(),
    limit: z.number().positive(),
    unit: z.enum(['bytes', 'count']),
    note: z.string().optional()
});
export type ExternalServiceMeter = z.infer<typeof externalServiceMeterSchema>;

export const externalServiceSchema = z.object({
    /** Unique within its contributor; the host prefixes it with the module id. */
    id: z.string().min(1),
    /** "Stripe", "Open-Meteo". */
    name: z.string().min(1),
    /** Who runs it, when the name does not say: "OVHcloud". */
    provider: z.string().optional(),
    state: externalServiceStateSchema,
    /** One sentence for a person, never a stack trace. */
    summary: z.string().optional(),
    facts: z.array(externalServiceFactSchema).optional(),
    meters: z.array(externalServiceMeterSchema).optional()
});
export type ExternalService = z.infer<typeof externalServiceSchema>;
