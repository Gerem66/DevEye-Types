import { z } from 'zod';

/**
 * Server readiness / boot status (HTTP, `GET /api/status`).
 *
 * Surfaces the deployment/startup tasks the server runs before it is "100%
 * ready" — today just the agent-binary reconcile, but the shape is a generic
 * task list so more steps can be added later. The web client shows a discreet
 * topbar zone while `ready` is false, then hides it for good.
 */

/**
 * `warning` is a terminal-but-visible outcome: the step finished without fully
 * succeeding, yet the app is usable (e.g. the agent reconcile served an older set
 * because this deploy's build never landed). It keeps the topbar zone shown — like
 * `error` — but reads as a non-blocking caution rather than a hard failure.
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
    tasks: z.array(bootTaskSchema)
});

export type ServerStatus = z.infer<typeof serverStatusSchema>;
