import { z } from 'zod';
import { metricSeriesPointSchema, metricsResolutionSchema } from '../domain/metrics';
import { presenceEventSchema } from '../domain/presence';
import { processSampleSchema } from '../domain/report';

const deviceId = z.string().uuid();

/** Fetch a time-series window for graphs, optionally downsampled. */
export const metricsQuery = {
    command: 'metrics.query' as const,
    input: z.object({
        deviceId,
        from: z.number().int().nonnegative(),
        to: z.number().int().positive(),
        resolution: metricsResolutionSchema.default('raw')
    }),
    output: z.object({
        deviceId,
        points: z.array(metricSeriesPointSchema)
    })
};

/** Subscribe to live metric pushes for one or more devices. */
export const metricsSubscribe = {
    command: 'metrics.subscribe' as const,
    input: z.object({ deviceIds: z.array(deviceId).min(1).max(50) }),
    output: z.object({ deviceIds: z.array(deviceId) })
};

export const metricsUnsubscribe = {
    command: 'metrics.unsubscribe' as const,
    input: z.object({ deviceIds: z.array(deviceId).min(1).max(50) }),
    output: z.object({ deviceIds: z.array(deviceId) })
};

/** Ask an online device to push a fresh sample + report right now. */
export const metricsRefresh = {
    command: 'metrics.refresh' as const,
    input: z.object({ deviceId }),
    /** `requested` is false when the device isn't currently connected. */
    output: z.object({ deviceId, requested: z.boolean() })
};

/** Agent connectivity over a window, to draw the uptime timeline. */
export const metricsPresence = {
    command: 'metrics.presence' as const,
    input: z.object({
        deviceId,
        from: z.number().int().nonnegative(),
        to: z.number().int().positive()
    }),
    output: z.object({
        deviceId,
        /** Online state at `from` (carried over from the last prior event). */
        onlineAtStart: z.boolean(),
        events: z.array(presenceEventSchema)
    })
};

/** Processes captured nearest to a given instant (null if none in range). */
export const metricsProcessesAt = {
    command: 'metrics.processesAt' as const,
    input: z.object({ deviceId, at: z.number().int().positive() }),
    output: z.object({ deviceId, sample: processSampleSchema.nullable() })
};

/** Distinct local days (YYYY-MM-DD) that have metric data, for the calendar. */
export const metricsAvailability = {
    command: 'metrics.availability' as const,
    input: z.object({
        deviceId,
        /** Client UTC offset (`Date.getTimezoneOffset()`), to bucket by local day. */
        tzOffsetMinutes: z.number().int().default(0)
    }),
    output: z.object({ deviceId, days: z.array(z.string()) })
};

/** Timestamps of process snapshots in a window, to mark them on the timeline. */
export const metricsSnapshots = {
    command: 'metrics.snapshots' as const,
    input: z.object({
        deviceId,
        from: z.number().int().nonnegative(),
        to: z.number().int().positive()
    }),
    output: z.object({ deviceId, timestamps: z.array(z.number().int().positive()) })
};

export const metricsCommands = [
    metricsQuery,
    metricsSubscribe,
    metricsUnsubscribe,
    metricsRefresh,
    metricsPresence,
    metricsProcessesAt,
    metricsAvailability,
    metricsSnapshots
] as const;
