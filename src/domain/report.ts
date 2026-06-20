import { z } from 'zod';

/**
 * "Latest known state" report for a device — distinct from the time-series
 * metric snapshots. It carries slow-moving / heavier signals (OS info, security
 * posture, top processes) that don't belong in the per-cycle metric stream.
 *
 * The agent emits one on connect and then periodically (every couple of
 * minutes). The server persists only the most recent report per device
 * (`devices.report_json`) and fans it out live to subscribers.
 *
 * Every security field is nullable: collectors are best-effort and shell out to
 * OS tools that may be absent or require privileges. `null` means "unknown".
 */

/** One of the heaviest processes at report time. */
export const reportProcessSchema = z.object({
    name: z.string().min(1).max(128),
    cpuPercent: z.number().min(0),
    memBytes: z.number().int().nonnegative()
});

export type ReportProcess = z.infer<typeof reportProcessSchema>;

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

export const deviceReportSchema = z.object({
    /** Unix ms when this report was collected on the agent. */
    collectedAt: z.number().int().positive(),
    os: z.object({
        name: z.string().min(1).max(64),
        version: z.string().max(64),
        arch: z.string().max(32)
    }),
    security: deviceSecuritySchema,
    topProcesses: z.array(reportProcessSchema).max(5)
});

export type DeviceReport = z.infer<typeof deviceReportSchema>;
