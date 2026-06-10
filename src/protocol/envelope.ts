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

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error';
