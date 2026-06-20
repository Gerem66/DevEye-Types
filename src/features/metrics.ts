import { z } from 'zod';
import { metricSeriesPointSchema, metricsResolutionSchema } from '../domain/metrics';

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

export const metricsCommands = [
    metricsQuery,
    metricsSubscribe,
    metricsUnsubscribe,
    metricsRefresh
] as const;
