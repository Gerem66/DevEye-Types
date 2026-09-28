import { z } from 'zod';

/**
 * Simultaneous seats: how many free accounts and how many priority accounts
 * (`AccountPlan.priority`) may hold a socket at once, set per server by the
 * global admin. Beyond a cap, the next ones wait in line.
 */

export const seatSchema = z.enum(['free', 'paid']);
export type Seat = z.infer<typeof seatSchema>;

/** `null`: no cap. */
export const seatCapsSchema = z.object({
    free: z.number().int().min(1).max(1_000_000).nullable(),
    paid: z.number().int().min(1).max(1_000_000).nullable()
});
export type SeatCaps = z.infer<typeof seatCapsSchema>;

/**
 * WebSocket close code for an account waiting in line. The `session` frame
 * before it carries the `queued` error, its details `{ position }`: the client
 * shows the waiting room and tries again shortly.
 */
export const QUEUE_CLOSE_CODE = 4429;

/**
 * WebSocket close code for an account whose seat went to someone waiting,
 * after a long time without any activity. The client does not reconnect until
 * the person comes back.
 */
export const IDLE_CLOSE_CODE = 4408;

/** Client frame, no reply: the person just used the page (at most once a minute). */
export const SESSION_ACTIVE_COMMAND = 'session.active' as const;

export const queueRefusalSchema = z.object({ position: z.number().int().positive() });
export type QueueRefusal = z.infer<typeof queueRefusalSchema>;
