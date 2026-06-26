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
 * One established TCP connection at collection time — the detail behind the
 * `activeConnections` metric (which only carries the count). Addresses are kept
 * as strings so both IPv4 and IPv6 peers display as-is.
 */
export const tcpConnectionSchema = z.object({
    localAddress: z.string().max(64),
    localPort: z.number().int().min(0).max(65535),
    remoteAddress: z.string().max(64),
    remotePort: z.number().int().min(0).max(65535)
});

export type TcpConnection = z.infer<typeof tcpConnectionSchema>;

/**
 * The agent's own runtime identity. Lets the UI explain *why* some best-effort
 * probes are limited — chiefly whether it runs with privileges (root/elevated).
 */
export const agentServiceScopeSchema = z.enum(['none', 'user', 'system']);
export type AgentServiceScope = z.infer<typeof agentServiceScopeSchema>;

export const agentInfoSchema = z.object({
    /** Running as root (Unix euid 0) / elevated (Windows). */
    privileged: z.boolean(),
    /** OS account the agent runs as (e.g. `root`, `deploy`). */
    user: z.string().max(128),
    /**
     * How the agent is installed for persistence: `none` (transient run), `user`
     * (per-user autostart, login session) or `system` (root/system service, boot).
     * Optional + defaulted so reports from agents predating this field still parse.
     */
    serviceScope: agentServiceScopeSchema.default('none'),
    /** True when launched by a service manager (so a self-update just exits to be relaunched). */
    managed: z.boolean().default(false)
});

export type AgentInfo = z.infer<typeof agentInfoSchema>;

/**
 * Processor identity (best-effort, read from `sysinfo`). `frequencyMhz` is the
 * nominal/base frequency the OS reports — `null` when it couldn't be read.
 */
export const cpuInfoSchema = z.object({
    /** Brand string, e.g. "Apple M1 Pro" or "Intel(R) Core(TM) i7-1185G7". */
    model: z.string().max(256),
    /** Vendor id (e.g. `GenuineIntel`, `AuthenticAMD`); null when unknown. */
    vendor: z.string().max(128).nullable().default(null),
    /** Physical cores; null when the OS can't report them. */
    physicalCores: z.number().int().nonnegative().nullable().default(null),
    /** Logical cores (threads). */
    logicalCores: z.number().int().nonnegative(),
    /** Nominal/base frequency in MHz; null when unknown. */
    frequencyMhz: z.number().int().nonnegative().nullable().default(null)
});

export type CpuInfo = z.infer<typeof cpuInfoSchema>;

/**
 * A network interface's inferred class. Best-effort: derived from the OS hardware
 * port (macOS) or the interface name, so `other`/`virtual` cover anything we
 * can't confidently bucket.
 */
export const netInterfaceKindSchema = z.enum([
    'wifi',
    'ethernet',
    'bluetooth',
    'loopback',
    'virtual',
    'other'
]);
export type NetInterfaceKind = z.infer<typeof netInterfaceKindSchema>;

/** One network interface on the host (name + hardware address + inferred kind). */
export const netInterfaceSchema = z.object({
    name: z.string().min(1).max(128),
    kind: netInterfaceKindSchema,
    /** MAC address, `null` when unavailable or all-zero (e.g. loopback). */
    mac: z.string().max(64).nullable().default(null)
});

export type NetInterface = z.infer<typeof netInterfaceSchema>;

/**
 * Static hardware inventory of the monitored machine — slow-moving facts (CPU,
 * RAM, GPU, connectivity) carried alongside the report. Every list is best-effort
 * and may be empty; `bluetooth` is `null` when no adapter was detected.
 */
export const deviceHardwareSchema = z.object({
    cpu: cpuInfoSchema,
    /** Total physical RAM, in bytes. */
    memoryTotalBytes: z.number().int().nonnegative(),
    /** GPU model names (best-effort; may be empty). */
    gpus: z.array(z.string().max(256)).max(16).default([]),
    /** Network interfaces (best-effort; may be empty). */
    network: z.array(netInterfaceSchema).max(64).default([]),
    /** Bluetooth adapter descriptor; `null` when none detected. */
    bluetooth: z.string().max(256).nullable().default(null)
});

export type DeviceHardware = z.infer<typeof deviceHardwareSchema>;

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
     * Static hardware inventory (CPU, RAM, GPU, network, bluetooth). `null` on
     * legacy reports stored before this field existed; the agent always sends it.
     */
    hardware: deviceHardwareSchema.nullable().default(null),
    /**
     * Listening sockets. `null` = not collected (legacy report); `[]` = collected
     * and none found. Sorted by port, capped at 500 by the agent.
     */
    openPorts: z.array(openPortSchema).max(500).nullable().default(null),
    /**
     * Established TCP connections (the detail behind the `activeConnections`
     * metric). `null` = not collected (legacy report); `[]` = collected and none.
     * Sorted, capped at 500 by the agent.
     */
    connections: z.array(tcpConnectionSchema).max(500).nullable().default(null)
});

export type DeviceReport = z.infer<typeof deviceReportSchema>;
