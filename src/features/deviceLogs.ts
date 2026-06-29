import { z } from 'zod';
import { deviceLogFilterSchema, DEVICE_LOG_PAGE_MAX } from '../domain/deviceLogs';

const deviceId = z.uuid();

/**
 * Ask the agent to enumerate the log sources present on the device (system journal,
 * Docker containers, log files…). Owner-or-admin + agent online. The command only
 * acknowledges; the list arrives as a `device.logSources` push event (the caller
 * must be subscribed to the device).
 */
export const deviceLogSources = {
    command: 'device.logSources' as const,
    input: z.object({ deviceId }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Query one source with an advanced filter. `queryId` correlates the streamed
 * result back to this request (results have no requestId). Lines arrive as one or
 * more `device.logLines` push events, the last carrying `done: true`.
 */
export const deviceLogQuery = {
    command: 'device.logQuery' as const,
    input: z.object({
        deviceId,
        sourceId: z.string().min(1).max(512),
        /** Client-generated id echoed back on every `device.logLines` for this query. */
        queryId: z.string().min(1).max(64),
        filter: deviceLogFilterSchema.optional(),
        limit: z.number().int().positive().max(DEVICE_LOG_PAGE_MAX).optional()
    }),
    output: z.object({ ok: z.boolean() })
};

export const deviceLogCommands = [deviceLogSources, deviceLogQuery] as const;
