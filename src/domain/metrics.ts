import { z } from 'zod';

import { processKindSchema, reportProcessSchema } from './report';

/**
 * A single point-in-time sample emitted by an agent — **one instant, everything
 * together**: graph signals, the process count and the process list itself. The
 * agent runs one collection cadence, so a graph point can never exist without
 * the processes that explain it.
 *
 * Byte counters are absolute (used/total); the UI derives percentages and rates.
 * `timestamp` is unix ms and is the single key correlating a metric row with its
 * stored process list.
 */
export const metricSnapshotSchema = z.object({
    timestamp: z.number().int().positive(),
    cpuPercent: z.number().min(0).max(100),
    memUsedBytes: z.number().int().nonnegative(),
    memTotalBytes: z.number().int().positive(),
    diskUsedBytes: z.number().int().nonnegative(),
    diskTotalBytes: z.number().int().positive(),
    netRxBytes: z.number().int().nonnegative(),
    netTxBytes: z.number().int().nonnegative(),
    /** Number of logged-in OS users at sample time. */
    usersCount: z.number().int().nonnegative(),
    /** 1-minute load average; null when unavailable on the platform. */
    loadAvg1: z.number().min(0).nullable().default(null),
    /** CPU package temperature in °C; null when no sensor is readable. */
    cpuTempC: z.number().nullable().default(null),
    /** System uptime in seconds; null when unavailable. */
    uptimeSeconds: z.number().int().nonnegative().nullable().default(null),
    /** Total running processes at sample time; null when unavailable. */
    processCount: z.number().int().nonnegative().nullable().default(null),
    /** Active (established) network connections; null when unavailable. */
    activeConnections: z.number().int().nonnegative().nullable().default(null),
    /** GPU utilization (%); null when no readable GPU sensor is available. */
    gpuPercent: z.number().min(0).max(100).nullable().default(null),
    /**
     * Cumulative disk bytes read since boot, summed over every process. Treated
     * as a counter (rate derived). Null when the platform doesn't expose
     * per-process I/O or the agent lacks the privileges to read it.
     */
    diskReadBytes: z.number().int().nonnegative().nullable().default(null),
    /** Cumulative disk bytes written; null under the same conditions. */
    diskWriteBytes: z.number().int().nonnegative().nullable().default(null),
    /** Battery charge (%); null when the machine has no battery. */
    batteryPercent: z.number().min(0).max(100).nullable().default(null),
    /** Whether the battery is charging / on AC; null when unknown or no battery. */
    batteryCharging: z.boolean().nullable().default(null),
    /**
     * Programs running at this instant, heaviest first, aggregated by name.
     * `null` = not carried by this row (capture mode `off`, or trimmed from a
     * long offline queue). Persisted separately (`device_process_samples`)
     * under this row's `timestamp`, so `metrics.query` does not echo it back.
     */
    processes: z.array(reportProcessSchema).max(2000).nullable().default(null),
    /**
     * Capture mode in effect when `processes` was taken, so history stays
     * labelled correctly even after the device's setting later changes (a queued
     * offline snapshot may predate the change). `null` when `processes` is null.
     */
    processKind: processKindSchema.nullable().default(null)
});

export type MetricSnapshot = z.infer<typeof metricSnapshotSchema>;

/**
 * Batch of snapshots pushed by an agent over the agent WebSocket. Bounded so an
 * offline queue drains in chunks; the agent additionally caps a batch by
 * serialized size, since 100 snapshots with process lists would make a
 * multi-megabyte frame.
 */
export const metricsBatchSchema = z.object({
    deviceId: z.uuid(),
    snapshots: z.array(metricSnapshotSchema).min(1).max(100)
});

export type MetricsBatch = z.infer<typeof metricsBatchSchema>;

/**
 * Bucketing resolution for time-series queries used to feed graphs. The client
 * picks it from the window span and tops out at `hour` — a coarser bucket would
 * flatten a day into a handful of points.
 */
export const metricsResolutionSchema = z.enum(['raw', 'minute', 'hour']);
export type MetricsResolution = z.infer<typeof metricsResolutionSchema>;

/**
 * A point read back from `device_metrics`: a snapshot minus its process list,
 * which lives in its own table (`metrics.processesAt`). A graph window holds
 * hundreds of points; carrying every process list along would cost megabytes.
 */
export const metricSeriesPointSchema = metricSnapshotSchema.omit({
    processes: true,
    processKind: true
});
export type MetricSeriesPoint = z.infer<typeof metricSeriesPointSchema>;

export interface MetricRow {
    id: number;
    device_id: string;
    ts: number;
    cpu_percent: number;
    mem_used_bytes: number;
    mem_total_bytes: number;
    disk_used_bytes: number;
    disk_total_bytes: number;
    net_rx_bytes: number;
    net_tx_bytes: number;
    users_count: number;
    load_avg_1: number | null;
    cpu_temp_c: number | null;
    uptime_seconds: number | null;
    process_count: number | null;
    active_connections: number | null;
    gpu_percent: number | null;
    disk_read_bytes: number | null;
    disk_write_bytes: number | null;
    battery_percent: number | null;
    battery_charging: number | null;
    /** 1 when the instant is pinned — kept past the device's retention. */
    pinned: number;
}
