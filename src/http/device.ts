import { z } from 'zod';
import { devicePlatformSchema, deviceSchema } from '../domain/device';

/**
 * Device linking & enrollment (HTTP, distinct from the user feature protocol).
 *
 * Flow:
 *  1. A logged-in user requests a short-lived link code (web UI).
 *  2. The agent posts the code + machine fingerprint + public key to enroll.
 *  3. The server creates a `pending` device and returns a device token (JWT).
 *  4. The user confirms the device in the Clients page to activate it.
 */

export const linkCodeResponseSchema = z.object({
    /** Short human-typable code (e.g. shown in the UI, entered on the agent). */
    code: z.string().min(6).max(32),
    expiresAt: z.number().int().positive()
});

export type LinkCodeResponse = z.infer<typeof linkCodeResponseSchema>;

export const enrollDeviceRequestSchema = z.object({
    code: z.string().min(6).max(32),
    name: z.string().min(1).max(128),
    fingerprint: z.string().min(1).max(128),
    platform: devicePlatformSchema.default('linux'),
    /** X25519 public key (base64) for command signature verification. */
    publicKey: z.string().min(1).max(256)
});

export type EnrollDeviceRequest = z.infer<typeof enrollDeviceRequestSchema>;

export const enrollDeviceResponseSchema = z.object({
    deviceId: z.string().uuid(),
    /** Long-lived device token (JWT). Stored only on the agent. */
    deviceToken: z.string().min(1),
    device: deviceSchema
});

export type EnrollDeviceResponse = z.infer<typeof enrollDeviceResponseSchema>;
