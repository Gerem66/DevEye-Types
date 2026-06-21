import { z } from 'zod';
import { deviceReportSchema, processCaptureSchema } from './report';

/**
 * Lifecycle of a monitored machine (the Rust agent):
 * - `pending`: enrolled via a link code but not yet confirmed in the UI.
 * - `active`:  confirmed; allowed to push metrics.
 * - `revoked`: access withdrawn; its device token is rejected.
 */
export const deviceStatusSchema = z.enum(['pending', 'active', 'revoked']);
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;

export const devicePlatformSchema = z.enum(['linux', 'macos']);
export type DevicePlatform = z.infer<typeof devicePlatformSchema>;

/**
 * Client-facing device. Secrets (token hash, public key) are never exposed.
 * `online` is live presence, derived from an active agent connection.
 */
export const deviceSchema = z.object({
    id: z.string().uuid(),
    ownerId: z.number().int().nonnegative(),
    name: z.string().min(1).max(128),
    fingerprint: z.string().min(1).max(128),
    platform: devicePlatformSchema,
    status: deviceStatusSchema,
    online: z.boolean(),
    lastSeen: z.number().int().nonnegative().nullable(),
    created: z.number().int().nonnegative(),
    /** Latest known health/security report; null until the agent sends one. */
    report: deviceReportSchema.nullable().default(null),
    /** Metric (graph) sampling interval in seconds; null → server default (10). */
    metricIntervalSeconds: z.number().int().positive().nullable().default(null),
    /** Snapshot (process capture) interval in seconds; null → server default (300). */
    snapshotIntervalSeconds: z.number().int().positive().nullable().default(null),
    /** Which processes to capture per snapshot; null → server default (`all`). */
    processCapture: processCaptureSchema.nullable().default(null),
    /** Metric/presence history retention in days; null → server default. */
    retentionDays: z.number().int().positive().nullable().default(null),
    /** Process-history retention in days; null → server default (1). */
    processRetentionDays: z.number().int().positive().nullable().default(null)
});

export type Device = z.infer<typeof deviceSchema>;

/**
 * Database row shape (server-only). Mirrors columns exactly.
 */
export interface DeviceRow {
    id: string;
    owner_id: number;
    name: string;
    fingerprint: string;
    platform: string;
    status: DeviceStatus;
    /** X25519 public key (base64) used for command signature verification. */
    public_key: string | null;
    /** SHA-256 hash of the device token (the raw token lives only on the agent). */
    token_hash: string;
    last_seen: number | null;
    created: number;
    /** JSON-encoded latest `DeviceReport`, or null if none received yet. */
    report_json: string | null;
    /** Metric sampling interval in seconds; null → server default. */
    metric_interval_seconds: number | null;
    /** Snapshot (process capture) interval in seconds; null → server default. */
    snapshot_interval_seconds: number | null;
    /** Process capture mode (`off`|`top`|`all`); null → server default. */
    process_capture: string | null;
    /** Metric/presence history retention in days; null → server default. */
    retention_days: number | null;
    /** Process-history retention in days; null → server default. */
    process_retention_days: number | null;
}
