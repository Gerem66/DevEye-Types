import { z } from 'zod';
import { logEntrySchema, logSourceSchema } from '../domain/logs';

/** Upper bound on a single page of results (the server clamps to this). */
export const LOGS_PAGE_MAX = 200;
export const LOGS_PAGE_DEFAULT = 50;

/**
 * The shared filter surface for the logs feature. Every field is optional and
 * combines with the others as AND, so the UI can drill down precisely:
 * by user, origin channel, feature, exact action, importance floor, free text,
 * client IP and a date window. All omitted → the unfiltered, newest-first feed.
 */
export const logFilterSchema = z.object({
    /** Restrict to one acting user (0 = system events). */
    uid: z.number().int().nonnegative().optional(),
    /** Restrict to one origin channel (web / api / agent / system). */
    source: logSourceSchema.optional(),
    /** Restrict to one emitting feature/subsystem. */
    category: z.string().min(1).max(64).optional(),
    /** Restrict to one exact event key (e.g. `login.failed`). */
    action: z.string().min(1).max(64).optional(),
    /** Importance floor (inclusive): only entries with `level >= levelMin`. */
    levelMin: z.number().int().optional(),
    /** Free-text match against description / action / ip (case-insensitive). */
    search: z.string().max(200).optional(),
    /** Exact client IP. */
    ip: z.string().max(64).optional(),
    /** Window start, unix epoch seconds, inclusive. */
    dateFrom: z.number().int().nonnegative().optional(),
    /** Window end, unix epoch seconds, inclusive. */
    dateTo: z.number().int().nonnegative().optional()
});

export type LogFilter = z.infer<typeof logFilterSchema>;

/**
 * Page through log entries newest-first, applying the filter. Admin-only.
 * `total` is the count matching the filter (ignoring paging) so the UI can show
 * "x / total"; `hasMore` says whether another page exists past this one.
 */
export const logsList = {
    command: 'logs.list' as const,
    input: logFilterSchema.extend({
        limit: z.number().int().positive().max(LOGS_PAGE_MAX).optional(),
        offset: z.number().int().nonnegative().optional()
    }),
    output: z.object({
        logs: z.array(logEntrySchema),
        total: z.number().int().nonnegative(),
        hasMore: z.boolean()
    })
};

/** One distinct value present in the logs, with how many entries carry it. */
export const logsFacetSchema = z.object({
    value: z.string(),
    count: z.number().int().nonnegative()
});

/** A user that appears in the logs, with a display name and entry count. */
export const logsFacetUserSchema = z.object({
    uid: z.number().int().nonnegative(),
    username: z.string().nullable(),
    count: z.number().int().nonnegative()
});

/**
 * Distinct filter values actually present in the logs (users, categories,
 * sources, actions) with counts, so the client can offer data-driven filter
 * controls — naming users instead of bare ids — rather than a hard-coded list.
 * Admin-only.
 */
export const logsFacets = {
    command: 'logs.facets' as const,
    input: z.object({}),
    output: z.object({
        users: z.array(logsFacetUserSchema),
        categories: z.array(logsFacetSchema),
        sources: z.array(logsFacetSchema),
        actions: z.array(logsFacetSchema),
        total: z.number().int().nonnegative()
    })
};

export const logsCommands = [logsList, logsFacets] as const;
