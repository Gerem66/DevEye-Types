import { z } from 'zod';

/**
 * User-submitted feedback: a free-form remark, or a bug report carrying the
 * technical snapshot the client assembled at submit time.
 *
 * Stored in the clear, unlike feature data. The reader is the global admin, not
 * the author: sealing a report with the author's key would make it unreadable
 * by the only person meant to act on it.
 */

/** What a report claims to be. Only `bug` carries a snapshot. */
export const feedbackKindSchema = z.enum(['general', 'bug']);
export type FeedbackKind = z.infer<typeof feedbackKindSchema>;

/** Where a report stands in triage. `new` until an admin touches it. */
export const feedbackStatusSchema = z.enum(['new', 'open', 'done']);
export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;

export const FEEDBACK_MESSAGE_MAX = 4000;

/**
 * Ring sizes the client keeps in memory. Small on purpose: what precedes a bug
 * by more than a handful of steps rarely explains it, and every entry travels.
 */
export const FEEDBACK_REQUESTS_KEPT = 30;
export const FEEDBACK_ERRORS_KEPT = 10;
export const FEEDBACK_VIEWS_KEPT = 10;

/**
 * One request the client saw go by. Neither its body nor its response: only
 * enough to retrace a sequence. Bodies would carry passwords, decrypted content
 * and secrets into a report anyone with the admin role can read.
 */
export const feedbackRequestTraceSchema = z.object({
    /** Milliseconds before the report was opened (0 = just now). */
    ago: z.number().int().nonnegative(),
    /** `ws` for a feature command, `http` for an auth route. */
    channel: z.enum(['ws', 'http']),
    /** Command name, or method and path. */
    target: z.string().max(200),
    durationMs: z.number().int().nonnegative(),
    /** `ok`, or the protocol error code that came back. */
    outcome: z.string().max(40)
});
export type FeedbackRequestTrace = z.infer<typeof feedbackRequestTraceSchema>;

/** An error nothing caught: a render crash, or a rejected promise. */
export const feedbackErrorTraceSchema = z.object({
    ago: z.number().int().nonnegative(),
    source: z.enum(['error', 'rejection']),
    message: z.string().max(500),
    /** File and position, when the browser gives them. */
    origin: z.string().max(300).nullable(),
    /** Truncated stack; null when the browser exposes none. */
    stack: z.string().max(2000).nullable()
});
export type FeedbackErrorTrace = z.infer<typeof feedbackErrorTraceSchema>;

/** A view the user opened, in order: the shortest path to a reproduction. */
export const feedbackViewTraceSchema = z.object({
    ago: z.number().int().nonnegative(),
    /** View id (`logs`, `x-audit`, `device:…`), or `home` when it closed. */
    view: z.string().max(64)
});
export type FeedbackViewTrace = z.infer<typeof feedbackViewTraceSchema>;

/**
 * The technical report attached to a bug. Assembled client-side, so every field
 * is what the browser was willing to say — `null` means "not exposed here", not
 * "zero". The server never trusts it for identity: uid, IP and its own version
 * are stamped server-side.
 */
export const feedbackSnapshotSchema = z.object({
    browser: z.object({
        /** From `userAgentData` when present; the raw UA is always kept too. */
        name: z.string().max(120).nullable(),
        version: z.string().max(40).nullable(),
        platform: z.string().max(80).nullable(),
        mobile: z.boolean().nullable(),
        userAgent: z.string().max(500),
        language: z.string().max(40),
        timezone: z.string().max(80),
        cores: z.number().int().nonnegative().nullable(),
        /** `navigator.deviceMemory`, in GiB. Chromium only. */
        memoryGb: z.number().nonnegative().nullable(),
        online: z.boolean()
    }),
    viewport: z.object({
        width: z.number().int().nonnegative(),
        height: z.number().int().nonnegative(),
        pixelRatio: z.number().nonnegative(),
        reducedMotion: z.boolean(),
        colorScheme: z.enum(['light', 'dark'])
    }),
    app: z.object({
        /**
         * The bundle the tab is running. Compared to the server's own version
         * on read: a tab left open across a deploy explains a class of bugs by
         * itself.
         */
        clientVersion: z.string().max(40),
        /** View open when the report was written; null on the dashboard. */
        view: z.string().max(64).nullable(),
        workspaceId: z.number().int().positive().nullable(),
        /** WebSocket state (`open`, `closed`, `error`…). */
        connection: z.string().max(24),
        /** Seconds since this tab loaded. */
        sessionAgeSeconds: z.number().int().nonnegative(),
        /** Path only — the app carries no query but the active workspace. */
        path: z.string().max(300)
    }),
    requests: z.array(feedbackRequestTraceSchema).max(FEEDBACK_REQUESTS_KEPT),
    errors: z.array(feedbackErrorTraceSchema).max(FEEDBACK_ERRORS_KEPT),
    views: z.array(feedbackViewTraceSchema).max(FEEDBACK_VIEWS_KEPT)
});
export type FeedbackSnapshot = z.infer<typeof feedbackSnapshotSchema>;

/**
 * A report as served to the admin view. `username` and `handledByName` are
 * resolved server-side from the ids (null when the account is gone).
 */
export const feedbackEntrySchema = z.object({
    id: z.number().int().positive(),
    /** Submission time, unix epoch seconds. */
    created: z.number().int().nonnegative(),
    kind: feedbackKindSchema,
    status: feedbackStatusSchema,
    uid: z.number().int().nonnegative(),
    username: z.string().nullable(),
    /** Workspace open at submit time — context only, never a scope. */
    workspaceId: z.number().int().positive().nullable(),
    message: z.string(),
    ip: z.string(),
    /** Server version at submit time. */
    appVersion: z.string(),
    /** The bug report; null for a plain remark. */
    snapshot: feedbackSnapshotSchema.nullable(),
    handledAt: z.number().int().nonnegative().nullable(),
    handledBy: z.number().int().positive().nullable(),
    handledByName: z.string().nullable()
});
export type FeedbackEntry = z.infer<typeof feedbackEntrySchema>;

/** Raw `feedback` row as stored. `snapshot` is MySQL JSON (parsed by the driver). */
export interface FeedbackRow {
    id: number;
    uid: number;
    workspace_id: number | null;
    kind: string;
    message: string;
    snapshot: unknown;
    status: string;
    ip: string;
    app_version: string;
    created: number;
    handled_at: number | null;
    handled_by: number | null;
}
