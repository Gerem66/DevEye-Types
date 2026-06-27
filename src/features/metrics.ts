import { z } from 'zod';
import { metricSeriesPointSchema, metricsResolutionSchema } from '../domain/metrics';
import { presenceEventSchema } from '../domain/presence';
import { processSampleSchema } from '../domain/report';

const deviceId = z.uuid();

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
    output: z.object({
        deviceId,
        timestamps: z.array(z.number().int().positive()),
        /** Subset of `timestamps` that are pinned (kept past retention). */
        pinned: z.array(z.number().int().positive())
    })
};

/**
 * Pin (or unpin) the snapshots within `[from, to]` (inclusive). Pinned snapshots
 * keep their process list *and* their metric point past the device's retention.
 * Unpinning lets them expire again: rows already past their retention deadline are
 * deleted immediately, the rest at the next retention sweep.
 */
export const metricsSetSnapshotsPinned = {
    command: 'metrics.setSnapshotsPinned' as const,
    input: z
        .object({
            deviceId,
            from: z.number().int().nonnegative(),
            to: z.number().int().positive(),
            pinned: z.boolean()
        })
        .refine((v) => v.to >= v.from, { message: 'to must be >= from' }),
    output: z.object({
        deviceId,
        /** Distinct snapshot instants whose pin state changed. */
        affected: z.number().int().nonnegative(),
        /** Snapshot instants deleted right away on unpin (already past retention). */
        deletedSnapshots: z.number().int().nonnegative(),
        /** Process rows deleted right away on unpin. */
        deletedRows: z.number().int().nonnegative()
    })
};

/** Storage footprint of a device's stored process snapshots (count + bytes). */
export const metricsStorage = {
    command: 'metrics.storage' as const,
    input: z.object({ deviceId }),
    output: z.object({
        deviceId,
        /** Distinct snapshot instants kept for the device. */
        snapshots: z.number().int().nonnegative(),
        /** Total process rows across those snapshots. */
        rows: z.number().int().nonnegative(),
        /** Estimated bytes those rows occupy in the database (data + index). */
        bytes: z.number().int().nonnegative()
    })
};

/**
 * Delete the process snapshots within `[from, to]` (inclusive). A single snapshot
 * is removed by passing `from === to === ts`; a dragged zone passes its bounds.
 */
export const metricsDeleteSnapshots = {
    command: 'metrics.deleteSnapshots' as const,
    input: z
        .object({
            deviceId,
            from: z.number().int().nonnegative(),
            to: z.number().int().positive()
        })
        .refine((v) => v.to >= v.from, { message: 'to must be >= from' }),
    output: z.object({
        deviceId,
        /** Distinct snapshot instants removed. */
        deletedSnapshots: z.number().int().nonnegative(),
        /** Process rows removed. */
        deletedRows: z.number().int().nonnegative()
    })
};

export const metricsCommands = [
    metricsQuery,
    metricsSubscribe,
    metricsUnsubscribe,
    metricsRefresh,
    metricsPresence,
    metricsProcessesAt,
    metricsAvailability,
    metricsSnapshots,
    metricsStorage,
    metricsDeleteSnapshots,
    metricsSetSnapshotsPinned
] as const;
