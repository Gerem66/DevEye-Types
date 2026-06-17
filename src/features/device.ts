import { z } from 'zod';
import { deviceSchema } from '../domain/device';

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
    deviceDelete
] as const;
