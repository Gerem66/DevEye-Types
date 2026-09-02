import { z } from 'zod';
import {
    feedbackEntrySchema,
    feedbackKindSchema,
    feedbackSnapshotSchema,
    feedbackStatusSchema,
    FEEDBACK_MESSAGE_MAX
} from '../domain/feedback';

/** Upper bound on a single page of results (the server clamps to this). */
export const FEEDBACK_PAGE_MAX = 100;
export const FEEDBACK_PAGE_DEFAULT = 30;

/**
 * Submit a report. Open to any signed-in account, and the only command here
 * that is: reading feedback is an admin matter, writing one is not.
 *
 * The snapshot only makes sense on a `bug` — the server drops it otherwise, so
 * a remark can never quietly carry a technical report.
 */
export const feedbackSubmit = {
    command: 'feedback.submit' as const,
    input: z.object({
        kind: feedbackKindSchema,
        message: z.string().min(1).max(FEEDBACK_MESSAGE_MAX),
        snapshot: feedbackSnapshotSchema.nullable().default(null)
    }),
    output: z.object({ id: z.number().int().positive() })
};

/**
 * AND-combined filter for the admin list; every field is optional. All omitted
 * → the unfiltered, newest-first feed.
 */
export const feedbackFilterSchema = z.object({
    kind: feedbackKindSchema.optional(),
    status: feedbackStatusSchema.optional(),
    /** Restrict to one author. */
    uid: z.number().int().positive().optional(),
    /** Case-insensitive substring over the message. */
    search: z.string().max(200).optional()
});
export type FeedbackFilter = z.infer<typeof feedbackFilterSchema>;

/**
 * Page through reports newest-first. Admin-only. `total` counts what matches
 * the filter, ignoring paging; `hasMore` says whether a page follows.
 */
export const feedbackList = {
    command: 'feedback.list' as const,
    input: feedbackFilterSchema.extend({
        limit: z.number().int().positive().max(FEEDBACK_PAGE_MAX).optional(),
        offset: z.number().int().nonnegative().optional()
    }),
    output: z.object({
        entries: z.array(feedbackEntrySchema),
        total: z.number().int().nonnegative(),
        hasMore: z.boolean(),
        /** How many are still untouched, whatever the filter: the badge count. */
        pending: z.number().int().nonnegative()
    })
};

/** Move a report through triage. Admin-only. */
export const feedbackSetStatus = {
    command: 'feedback.setStatus' as const,
    input: z.object({
        id: z.number().int().positive(),
        status: feedbackStatusSchema
    }),
    output: z.object({ entry: feedbackEntrySchema })
};

/** Drop a report for good. Admin-only. */
export const feedbackDelete = {
    command: 'feedback.delete' as const,
    input: z.object({ id: z.number().int().positive() }),
    output: z.object({ deleted: z.literal(true) })
};

export const feedbackCommands = [
    feedbackSubmit,
    feedbackList,
    feedbackSetStatus,
    feedbackDelete
] as const;
