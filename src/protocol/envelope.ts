import { z } from 'zod';
import { ProtocolErrorSchema } from './error';

/**
 * WebSocket envelope shared between client and server.
 *
 * Client sends `ClientMessage` with `command`, `requestId` and `payload`.
 * Server replies with `ServerMessage` whose `requestId` matches; payload is a
 * `Result`-shaped object (success or protocol error). The server may also push
 * unsolicited events with no `requestId`.
 */

export const TASK_TITLE_MAX = 120;
export const TASK_TEXT_MAX = 300;

/** The id of a long operation: chosen by the client that starts it, shown to the whole account. */
export const taskIdSchema = z
    .string()
    .min(8)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/);

/**
 * What marks a command as a long operation the server follows (`domain/task`):
 * its answer is kept for a while and its progress is shown to the caller's
 * other tabs. The labels are the caller's: the interface sentences live in the
 * client, and they only ever go back to the account that sent them. The id is
 * not the `requestId`: the id is broadcast, the `requestId` never is, and
 * claiming the kept answer takes both.
 */
export const commandTaskSchema = z.object({
    id: taskIdSchema,
    title: z.string().trim().min(1).max(TASK_TITLE_MAX),
    /** What it acts on, to tell two operations with the same title apart. */
    subject: z.string().trim().min(1).max(TASK_TEXT_MAX).optional(),
    feature: z.string().min(1).max(64).optional(),
    itemId: z.string().min(1).max(64).optional(),
    /** The kind of operation, as the screens of the feature filter on it. */
    key: z.string().min(1).max(64).optional(),
    /** The sentence of a success and the fallback sentence of a failure, for a tab that did not start it. */
    done: z.string().trim().min(1).max(TASK_TEXT_MAX).optional(),
    failed: z.string().trim().min(1).max(TASK_TEXT_MAX).optional()
});

export type CommandTask = z.infer<typeof commandTaskSchema>;

export const clientMessageSchema = z.object({
    requestId: z.string().min(1),
    command: z.string().min(1),
    /**
     * Espace de travail visé par la commande. Absent → l'espace personnel de
     * l'appelant. Porté par l'enveloppe et non par chaque `payload` : `ws.send`
     * l'estampille, le serveur n'a qu'un seul point de résolution et
     * d'autorisation, et chaque message se décrit lui-même, reconnexions comprises.
     */
    workspaceId: z.number().int().positive().optional(),
    /** See {@link commandTaskSchema}. */
    task: commandTaskSchema.optional(),
    payload: z.unknown()
});

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export const serverMessageSchema = z.object({
    requestId: z.string().min(1).optional(),
    command: z.string().min(1),
    payload: z.discriminatedUnion('ok', [
        z.object({ ok: z.literal(true), data: z.unknown() }),
        z.object({ ok: z.literal(false), error: ProtocolErrorSchema })
    ])
});

export type ServerMessage = z.infer<typeof serverMessageSchema>;

/**
 * Progress of a pending command, pushed to its caller only (the `progress` of a
 * handler context), as an unsolicited event carrying the request it belongs to.
 * The client re-arms the request's timeout on each one: a command that keeps
 * reporting never times out, `timeoutMs` bounds its silence.
 */
export const REQUEST_PROGRESS_EVENT = 'request.progress' as const;

export const requestProgressSchema = z.object({
    requestId: z.string().min(1),
    done: z.number().int().nonnegative().optional(),
    total: z.number().int().nonnegative().optional(),
    step: z.string().max(200).optional()
});

export type RequestProgress = z.infer<typeof requestProgressSchema>;

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error';
