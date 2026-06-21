import { z } from 'zod';
import { deviceSchema } from '../domain/device';
import { processCaptureSchema } from '../domain/report';

const deviceId = z.string().uuid();

/** List devices visible to the caller (own devices; all devices for admins). */
export const deviceList = {
    command: 'device.list' as const,
    input: z.object({}),
    output: z.object({ devices: z.array(deviceSchema) })
};

/** Confirm a `pending` device, moving it to `active`. */
export const deviceConfirm = {
    command: 'device.confirm' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/** Revoke a device: its token is rejected and it can no longer push metrics. */
export const deviceRevoke = {
    command: 'device.revoke' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

export const deviceRename = {
    command: 'device.rename' as const,
    input: z.object({ deviceId, name: z.string().min(1).max(128) }),
    output: z.object({ device: deviceSchema })
};

/**
 * Update a device's collection config. Every field is optional; only the
 * provided ones change. `null` resets a field to the server default. Interval
 * or capture changes are pushed live to a connected agent.
 */
export const deviceSetConfig = {
    command: 'device.setConfig' as const,
    input: z
        .object({
            deviceId,
            /** Metric (graph) sampling interval in seconds (5s–1h). */
            metricIntervalSeconds: z.number().int().min(5).max(3600).nullable().optional(),
            /** Snapshot (process capture) interval in seconds (1min–1day). */
            snapshotIntervalSeconds: z.number().int().min(60).max(86400).nullable().optional(),
            processCapture: processCaptureSchema.nullable().optional(),
            retentionDays: z.number().int().positive().max(3650).nullable().optional(),
            processRetentionDays: z.number().int().positive().max(3650).nullable().optional()
        })
        .refine(
            (v) =>
                v.metricIntervalSeconds !== undefined ||
                v.snapshotIntervalSeconds !== undefined ||
                v.processCapture !== undefined ||
                v.retentionDays !== undefined ||
                v.processRetentionDays !== undefined,
            { message: 'No config field provided' }
        ),
    output: z.object({ device: deviceSchema })
};

/** Reactivate a revoked device, moving it back to `active`. */
export const deviceReactivate = {
    command: 'device.reactivate' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/**
 * Request a managed deletion (from the Appareils page). The device moves to
 * `pending_deletion`: on its next connection the agent is told to self-destruct
 * (wipe its local config + binary), after which the device is archived — its
 * monitoring history is kept and stays browsable, but it's gone from management.
 * If the agent is online the destroy signal is sent immediately.
 */
export const deviceRequestDelete = {
    command: 'device.requestDelete' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/** Cancel a `pending_deletion` (only effective while the agent hasn't reconnected). */
export const deviceCancelDelete = {
    command: 'device.cancelDelete' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/**
 * Finalise a deletion immediately: archive the device now without waiting for the
 * agent to self-destruct (use when the agent is gone, or you don't care if it
 * cleans itself up). A still-connected agent is told to self-destruct best-effort,
 * but the device is archived regardless; if it ever reconnects it's refused.
 */
export const deviceForceDelete = {
    command: 'device.forceDelete' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/**
 * Hard-purge a device and ALL its monitoring history (used by the Monitoring
 * page to remove an archived — or any — device and reset its data). Works
 * whether the agent is online or not; it does not self-destruct the agent.
 */
export const deviceDelete = {
    command: 'device.delete' as const,
    input: z.object({ deviceId }),
    output: z.object({ deviceId })
};

export const deviceCommands = [
    deviceList,
    deviceConfirm,
    deviceRevoke,
    deviceReactivate,
    deviceRename,
    deviceSetConfig,
    deviceRequestDelete,
    deviceCancelDelete,
    deviceForceDelete,
    deviceDelete
] as const;
