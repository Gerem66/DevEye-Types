import { z } from 'zod';

/**
 * "Latest known state" report for a device — distinct from the time-series
 * metric snapshots. It carries slow-moving signals (OS info, security posture)
 * that don't belong in the per-cycle metric stream.
 *
 * The agent emits one on connect and then periodically. The server persists only
 * the most recent report per device (`devices.report_json`) and fans it out live.
 *
 * Every security field is nullable: collectors are best-effort and shell out to
 * OS tools that may be absent or require privileges. `null` means "unknown".
 *
 * Processes are historised separately (see `processSampleSchema`) so the UI can
 * show what was running at any past moment, not just the latest.
 */

/** One process at sample time (CPU%, resident memory in bytes). */
export const reportProcessSchema = z.object({
    name: z.string().min(1).max(128),
    cpuPercent: z.number().min(0),
    memBytes: z.number().int().nonnegative()
});

export type ReportProcess = z.infer<typeof reportProcessSchema>;

/**
 * Per-device process capture mode (set from the UI, pushed to the agent):
 * - `off`: don't collect processes at all (saves the most space);
 * - `top`: only the ~20 heaviest (scored on CPU% + memory%);
 * - `all`: every process.
 */
export const processCaptureSchema = z.enum(['off', 'top', 'all']);
export type ProcessCapture = z.infer<typeof processCaptureSchema>;

/**
 * Kind of a stored process sample = the capture mode in effect when it was
 * taken (`top` or `all`; `off` produces no sample). Recorded per-sample so the
 * UI can label history correctly even after the mode later changes.
 */
export const processKindSchema = z.enum(['top', 'all']);
export type ProcessKind = z.infer<typeof processKindSchema>;

export const processSampleSchema = z.object({
    ts: z.number().int().positive(),
    kind: processKindSchema,
    processes: z.array(reportProcessSchema).max(2000)
});

export type ProcessSample = z.infer<typeof processSampleSchema>;

export interface ProcessSampleRow {
    id: number;
    device_id: string;
    ts: number;
    kind: ProcessKind;
    name: string;
    cpu_percent: number;
    mem_bytes: number;
}

/** Security posture of the monitored machine. `null` = could not be determined. */
export const deviceSecuritySchema = z.object({
    /** Host firewall enabled (macOS ALF / Linux ufw|firewalld). */
    firewall: z.boolean().nullable(),
    /** System volume encrypted (macOS FileVault / Linux LUKS). */
    diskEncryption: z.boolean().nullable(),
    /** System Integrity Protection (macOS only; null elsewhere). */
    sip: z.boolean().nullable(),
    /** Count of pending OS updates (null when not collected, e.g. macOS). */
    pendingUpdates: z.number().int().nonnegative().nullable()
});

export type DeviceSecurity = z.infer<typeof deviceSecuritySchema>;

/** One mounted disk/volume, for the per-disk breakdown (multi-disk machines). */
export const reportDiskSchema = z.object({
    /** Representative mount point (e.g. `/` or `/Volumes/Data`). */
    mount: z.string().min(1).max(256),
    usedBytes: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative()
});

export type ReportDisk = z.infer<typeof reportDiskSchema>;

/**
 * One listening socket on the monitored machine. `address` is the bind address
 * (`0.0.0.0`/`::` = all interfaces, `127.0.0.1`/`::1` = loopback only) so the UI
 * can distinguish world-exposed ports from local ones.
 */
export const openPortSchema = z.object({
    proto: z.enum(['tcp', 'udp']),
    port: z.number().int().min(0).max(65535),
    address: z.string().max(64)
});

export type OpenPort = z.infer<typeof openPortSchema>;

/**
 * The agent's own runtime identity. Lets the UI explain *why* some best-effort
 * probes are limited — chiefly whether it runs with privileges (root/elevated).
 */
export const agentInfoSchema = z.object({
    /** Running as root (Unix euid 0) / elevated (Windows). */
    privileged: z.boolean(),
    /** OS account the agent runs as (e.g. `root`, `deploy`). */
    user: z.string().max(128)
});

export type AgentInfo = z.infer<typeof agentInfoSchema>;

export const deviceReportSchema = z.object({
    /** Unix ms when this report was collected on the agent. */
    collectedAt: z.number().int().positive(),
    os: z.object({
        name: z.string().min(1).max(64),
        version: z.string().max(64),
        arch: z.string().max(32),
        /** Logical CPU cores, for interpreting the load average (0 = unknown). */
        cores: z.number().int().nonnegative().default(0)
    }),
    security: deviceSecuritySchema,
    /** Per-disk usage (deduped across shared APFS volumes). Empty if unknown. */
    disks: z.array(reportDiskSchema).default([]),
    /**
     * The agent's runtime identity (privilege level + account). `null` on legacy
     * reports stored before this field existed; the agent always sends it now.
     */
    agent: agentInfoSchema.nullable().default(null),
    /**
     * Listening sockets. `null` = not collected (legacy report); `[]` = collected
     * and none found. Sorted by port, capped at 500 by the agent.
     */
    openPorts: z.array(openPortSchema).max(500).nullable().default(null)
});

export type DeviceReport = z.infer<typeof deviceReportSchema>;
