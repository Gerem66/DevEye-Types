import { z } from 'zod';

/**
 * Agent connectivity history. The server records a transition each time an agent
 * connects or disconnects; the UI replays these to draw an online/offline
 * timeline (the "frise") and compute uptime over a window.
 */
export const presenceEventSchema = z.object({
    /** Unix ms of the transition. */
    ts: z.number().int().positive(),
    online: z.boolean()
});

export type PresenceEvent = z.infer<typeof presenceEventSchema>;

export interface PresenceRow {
    id: number;
    device_id: string;
    ts: number;
    online: 0 | 1;
}
