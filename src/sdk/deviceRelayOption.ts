/**
 * A device as a module's form offers it for reaching a service through its
 * agent (`@deveye/types/sdk/server`'s `relayDeviceOptions`). The pure half,
 * shared by the command that lists them and the field that shows them.
 */
import { z } from 'zod';

/**
 * `blocked` says what keeps the caller from choosing this device (right,
 * agent version, machine policy); a device one cannot choose stays listed,
 * that is how one learns why.
 */
export const deviceRelayOptionSchema = z.object({
    id: z.uuid(),
    name: z.string(),
    online: z.boolean(),
    blocked: z.string().nullable()
});
export type DeviceRelayOption = z.infer<typeof deviceRelayOptionSchema>;
