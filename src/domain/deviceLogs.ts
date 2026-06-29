import { z } from 'zod';

/**
 * Device log viewer — entities shared by the agent, server and client.
 *
 * Distinct from `domain/logs.ts` (the *audit* log of DevEye itself). These types
 * describe **on-device** logs the agent reads live: the system journal, per-Docker
 * container logs, plain syslog files, the macOS unified log, the Windows event log.
 */

/** What kind of reader backs a source (drives the agent's query strategy + the icon). */
export const deviceLogSourceKindSchema = z.enum([
    'journald', // systemd journal (Linux)
    'docker', // one Docker container
    'syslog', // a plain text log file (e.g. /var/log/syslog)
    'oslog', // macOS unified logging (`log show`)
    'eventlog' // Windows event log channel
]);
export type DeviceLogSourceKind = z.infer<typeof deviceLogSourceKindSchema>;

/**
 * A queryable log source discovered on a device. `id` is an opaque token the agent
 * resolves back to a concrete reader (e.g. `journald`, `docker:<id>`,
 * `file:/var/log/syslog`, `eventlog:System`) — the client never parses it.
 */
export const deviceLogSourceSchema = z.object({
    id: z.string().min(1).max(512),
    kind: deviceLogSourceKindSchema,
    /** Human label (service/container/file name). */
    label: z.string().min(1).max(256),
    /** Extra UI context (Docker image, file path, channel description). */
    detail: z.string().max(256).nullable().optional(),
    /** For Docker: whether the container is currently running (stopped ones still have logs). */
    running: z.boolean().nullable().optional()
});
export type DeviceLogSource = z.infer<typeof deviceLogSourceSchema>;

/** Normalised severity, coarsest → highest. Ordered for `levelMin` comparisons. */
export const DEVICE_LOG_LEVELS = [
    'debug',
    'info',
    'notice',
    'warning',
    'error',
    'critical'
] as const;
export const deviceLogLevelSchema = z.enum(DEVICE_LOG_LEVELS);
export type DeviceLogLevel = z.infer<typeof deviceLogLevelSchema>;

/** One log line. `ts` is unix **milliseconds** (null when the source carries none). */
export const deviceLogLineSchema = z.object({
    ts: z.number().int().nullable(),
    level: deviceLogLevelSchema.nullable(),
    message: z.string(),
    /** Originating unit/service (journald) or container short id (docker), when known. */
    unit: z.string().max(256).nullable().optional()
});
export type DeviceLogLine = z.infer<typeof deviceLogLineSchema>;

export const DEVICE_LOG_PAGE_MAX = 1000;
export const DEVICE_LOG_PAGE_DEFAULT = 200;

/**
 * Advanced search surface for a query. Every field is optional and combines as
 * AND, so the UI can drill down precisely (text/regex, severity floor, unit, time
 * window). All omitted → the newest `limit` lines of the source.
 */
export const deviceLogFilterSchema = z.object({
    /** Free-text (or regex when `regex`) match against the message, case-insensitive. */
    search: z.string().max(500).optional(),
    /** Treat `search` as a regular expression. */
    regex: z.boolean().optional(),
    /** Severity floor (inclusive): only lines with level >= this. */
    levelMin: deviceLogLevelSchema.optional(),
    /** journald unit / service filter (e.g. `nginx.service`). Ignored by other kinds. */
    unit: z.string().max(256).optional(),
    /** Window start, unix epoch **seconds**, inclusive. */
    since: z.number().int().nonnegative().optional(),
    /** Window end, unix epoch **seconds**, inclusive. */
    until: z.number().int().nonnegative().optional()
});
export type DeviceLogFilter = z.infer<typeof deviceLogFilterSchema>;
