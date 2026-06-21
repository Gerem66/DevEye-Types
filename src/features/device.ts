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

/** Permanently delete a device and its stored metrics. */
export const deviceDelete = {
    command: 'device.delete' as const,
    input: z.object({ deviceId }),
    output: z.object({ deviceId })
};

export const deviceCommands = [
    deviceList,
    deviceConfirm,
    deviceRevoke,
    deviceRename,
    deviceSetConfig,
    deviceDelete
] as const;
