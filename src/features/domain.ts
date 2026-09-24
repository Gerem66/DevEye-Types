import { z } from 'zod';
import { FEATURE_DOMAIN_HOST_MAX, featureDomainSchema } from '../domain/featureDomain';
import { featureIdSchema } from '../domain/workspaceRole';

/**
 * The domains of one feature in the active workspace. Cross-cutting: the
 * feature is an input, and each command authorizes against it (read to list,
 * write for the rest). A feature whose manifest declares no `domains` is
 * refused.
 */

export const domainList = {
    command: 'domain.list' as const,
    input: z.object({ feature: featureIdSchema }),
    output: z.object({
        domains: z.array(featureDomainSchema),
        /**
         * How a web domain gets its HTTPS certificate on this instance: `auto`
         * when DevEye feeds its proxy, `manual` when the administrator adds
         * each name. Null when the feature's domains are not web ones.
         */
        https: z.enum(['auto', 'manual']).nullable(),
        /**
         * The workspace owner's allowance of web domains, counted as distinct
         * names across all their workspaces. Null when unbounded.
         */
        quota: z
            .object({ used: z.number().int().nonnegative(), limit: z.number().int().nonnegative() })
            .nullable()
    })
};

export const domainAdd = {
    command: 'domain.add' as const,
    input: z.object({
        feature: featureIdSchema,
        host: z.string().min(1).max(FEATURE_DOMAIN_HOST_MAX)
    }),
    output: z.object({ domain: featureDomainSchema })
};

/** Runs both stages now instead of waiting for the background pass. */
export const domainVerify = {
    command: 'domain.verify' as const,
    input: z.object({ feature: featureIdSchema, id: z.number().int().positive() }),
    output: z.object({ domain: featureDomainSchema })
};

export const domainRemove = {
    command: 'domain.remove' as const,
    input: z.object({ feature: featureIdSchema, id: z.number().int().positive() }),
    output: z.object({ ok: z.literal(true) })
};

export const domainCommands = [domainList, domainAdd, domainVerify, domainRemove] as const;
