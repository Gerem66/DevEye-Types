import { z } from 'zod';

/**
 * Importance scale for a log entry, ordered low → high. Stored on the row as a
 * small integer so the DB can filter "at least warning" with a cheap `level >= n`
 * comparison, while the string label drives the UI (colour, filter dropdown).
 *
 * The numeric values are aligned with pino's level scale (debug 20 … fatal 60)
 * so the server's structured logger and the audit log share a single ladder.
 */
export const LOG_LEVELS = {
    debug: 20,
    info: 30,
    warning: 40,
    error: 50,
    critical: 60
} as const;

export type LogLevelName = keyof typeof LOG_LEVELS;

/** Levels ordered from least to most important (drives ordered UI controls). */
export const LOG_LEVEL_NAMES = ['debug', 'info', 'warning', 'error', 'critical'] as const;

export const logLevelNameSchema = z.enum(LOG_LEVEL_NAMES);

/** Numeric importance of a named level. */
export function logLevelValue(name: LogLevelName): number {
    return LOG_LEVELS[name];
}

/**
 * Resolve a stored numeric level to the closest named level at or below it, so
 * any integer maps to a label even if it doesn't land exactly on a rung
 * (`debug` for anything below the floor).
 */
export function logLevelName(value: number): LogLevelName {
    let resolved: LogLevelName = 'debug';
    for (const name of LOG_LEVEL_NAMES) {
        if (value >= LOG_LEVELS[name]) resolved = name;
    }
    return resolved;
}

/**
 * Origin channel of an action — answers "where did this come from?".
 *  - `web`    : the web client over the authenticated WS / HTTP session.
 *  - `api`    : an external API consumer (mobile app, scripts) — "Via API".
 *  - `agent`  : a device agent connection (metrics, presence).
 *  - `system` : the server itself (startup, migrations, scheduled work).
 */
export const logSourceSchema = z.enum(['web', 'api', 'agent', 'system']);
export type LogSource = z.infer<typeof logSourceSchema>;

/**
 * Known emitting subsystems. The schema stays a plain string (forward-compatible
 * — a new feature can log before this list is updated), but this constant is the
 * canonical set used to populate filter controls and to keep `category` values
 * consistent across emitters.
 */
export const LOG_CATEGORIES = [
    'auth',
    'user',
    'workspace',
    'password',
    'note',
    'device',
    'metrics',
    'weather',
    'twofa',
    'secrecy',
    'logs',
    'system'
] as const;

export type LogCategory = (typeof LOG_CATEGORIES)[number];

/**
 * A log entry as returned to the client. `username` is resolved server-side from
 * `uid` (null when the actor is the system or the account no longer exists), and
 * `metadata` is the parsed structured payload an emitter optionally attached.
 */
export const logEntrySchema = z.object({
    id: z.number().int().nonnegative(),
    /** Event time, unix epoch seconds. */
    date: z.number().int().nonnegative(),
    /** Numeric importance (see LOG_LEVELS). */
    level: z.number().int(),
    source: logSourceSchema,
    /** Emitting subsystem/feature (see LOG_CATEGORIES). */
    category: z.string(),
    /** Specific event key within the category, e.g. `login.success`. */
    action: z.string(),
    /** Acting user id; 0 for system / unauthenticated. */
    uid: z.number().int().nonnegative(),
    /** Resolved display name for `uid`, null when system or unknown. */
    username: z.string().nullable(),
    ip: z.string(),
    description: z.string(),
    /** Optional structured context attached by the emitter. */
    metadata: z.record(z.string(), z.unknown()).nullable()
});

export type LogEntry = z.infer<typeof logEntrySchema>;

/** Raw `logs` row as stored. `metadata` is MySQL JSON (parsed by the driver). */
export interface LogRow {
    id: number;
    uid: number;
    ip: string;
    source: string;
    category: string;
    action: string;
    level: number;
    description: string;
    metadata: unknown;
    date: number;
}
