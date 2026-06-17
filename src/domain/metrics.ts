import { z } from 'zod';

/**
 * A single point-in-time sample emitted by an agent. Byte counters are absolute
 * (used/total); the UI derives percentages and rates. `timestamp` is unix ms.
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
    usersCount: z.number().int().nonnegative()
});

export type MetricSnapshot = z.infer<typeof metricSnapshotSchema>;

/**
 * Batch of snapshots pushed by an agent over the agent WebSocket. Bounded to
 * keep payloads small and allow draining an offline queue in chunks.
 */
export const metricsBatchSchema = z.object({
    deviceId: z.string().uuid(),
    snapshots: z.array(metricSnapshotSchema).min(1).max(100)
});

export type MetricsBatch = z.infer<typeof metricsBatchSchema>;

/** Bucketing resolution for time-series queries used to feed graphs. */
export const metricsResolutionSchema = z.enum(['raw', 'minute', 'hour', 'day']);
export type MetricsResolution = z.infer<typeof metricsResolutionSchema>;

export const metricSeriesPointSchema = metricSnapshotSchema;
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
}
