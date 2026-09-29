import { z } from 'zod';

/**
 * Server readiness / boot status (HTTP, `GET /api/status`): the startup tasks
 * the server runs before it is fully ready, as a generic task list. The web
 * client shows a topbar zone while `ready` is false.
 */

/**
 * `warning` is terminal but visible: the step finished without fully succeeding
 * (e.g. the agent reconcile served an older set), the app is usable, and the
 * topbar zone stays shown as a non-blocking caution.
 */
export const bootTaskStateSchema = z.enum(['pending', 'running', 'done', 'warning', 'error']);
export type BootTaskState = z.infer<typeof bootTaskStateSchema>;

export const bootTaskSchema = z.object({
    /** Stable id (e.g. `agent-sync`). */
    id: z.string(),
    /** Human-readable label shown in the topbar zone. */
    label: z.string(),
    state: bootTaskStateSchema,
    /** 0..1 when known (e.g. binaries downloaded / total), else `null`. */
    progress: z.number().min(0).max(1).nullable(),
    /** Short live detail (e.g. "3/8 binaires"), else `null`. */
    detail: z.string().nullable(),
    /** Error message when `state === 'error'`, else `null`. */
    error: z.string().nullable()
});

export type BootTask = z.infer<typeof bootTaskSchema>;

export const serverStatusSchema = z.object({
    /** True once every task is `done` (or there are none): nothing more to show. */
    ready: z.boolean(),
    /** DevEye server version (its `package.json`). */
    version: z.string(),
    /** Does this server let another instance's page open a session (`FEDERATION_ORIGINS`)? */
    federation: z.boolean(),
    /**
     * The public status page watching this server (`STATUS_PAGE_URL`), which
     * stays reachable when the server is down; `null` when none is set.
     * Defaulted so an older remote instance still parses.
     */
    statusPageUrl: z.string().url().nullable().default(null),
    tasks: z.array(bootTaskSchema)
});

export type ServerStatus = z.infer<typeof serverStatusSchema>;

/**
 * `GET /.well-known/deveye-build.json`: every file of the web client this
 * server serves, with its SHA-256, written at build time. It is NOT a trusted
 * reference (a compromised server would rewrite it along with the files): it
 * is the LIST of what an integrity monitor on another instance must fetch,
 * lazily loaded chunks included, which nothing else names.
 */
export const buildManifestSchema = z.object({
    format: z.literal(1),
    version: z.string(),
    /** Path relative to the site root (no leading slash) to the file's SHA-256, hex. */
    files: z.record(
        z
            .string()
            .min(1)
            .max(512)
            .regex(/^(?!\/)(?!.*(^|\/)\.\.(\/|$))[^\s]+$/),
        z.string().regex(/^[0-9a-f]{64}$/)
    )
});

export type BuildManifest = z.infer<typeof buildManifestSchema>;

/** Where a DevEye instance publishes its build manifest. */
export const BUILD_MANIFEST_PATH = '/.well-known/deveye-build.json';
