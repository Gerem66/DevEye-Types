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
     * l'appelant.
     *
     * Il vit sur l'enveloppe, et non dans le `payload` de chaque commande, pour
     * trois raisons : aucun schéma d'entrée ne porte de `workspaceId`, aucun site
     * d'appel client ne le passe à la main (`ws.send` l'estampille), et le
     * serveur n'a qu'un seul point de résolution et d'autorisation. Le tenir dans
     * un état de session côté serveur serait plus fragile : la socket se
     * reconnecte seule (backoff, retour de focus) et une commande émise avant la
     * ré-activation viserait le mauvais espace — ici chaque message se décrit
     * lui-même.
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

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error';
