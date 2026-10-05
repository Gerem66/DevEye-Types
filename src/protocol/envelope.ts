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
