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

/** Hard cap on a custom code lifetime (30 days), to bound never-pruned rows. */
export const LINK_CODE_TTL_MAX_SECONDS = 30 * 24 * 60 * 60;

/**
 * Request a new link code. `ttlSeconds`:
 *  - omitted   → server default lifetime,
 *  - `null`    → no expiry (valid until used or deleted),
 *  - a number  → custom lifetime in seconds.
 */
export const linkCodeRequestSchema = z.object({
    ttlSeconds: z.number().int().positive().max(LINK_CODE_TTL_MAX_SECONDS).nullable().optional(),
    /**
     * Approve the device automatically the moment it enrols with this code,
     * instead of leaving it `pending` for manual approval. Defaults to `false`
     * (manual approval stays the safe default).
     */
    autoApprove: z.boolean().default(false)
});

export type LinkCodeRequest = z.infer<typeof linkCodeRequestSchema>;

export const linkCodeResponseSchema = z.object({
    /** Short human-typable code (e.g. shown in the UI, entered on the agent). */
    code: z.string().min(6).max(32),
    /** Unix seconds when the code expires; `null` means it never expires. */
    expiresAt: z.number().int().positive().nullable(),
    /** Whether a device enrolling with this code is approved automatically. */
    autoApprove: z.boolean()
});

export type LinkCodeResponse = z.infer<typeof linkCodeResponseSchema>;

/** Toggle the auto-approval of an existing (still-active) link code. */
export const linkCodeUpdateSchema = z.object({
    autoApprove: z.boolean()
});

export type LinkCodeUpdate = z.infer<typeof linkCodeUpdateSchema>;

/** Currently-active (unconsumed, unexpired) link codes for the caller. */
export const linkCodesListResponseSchema = z.object({
    codes: z.array(linkCodeResponseSchema)
});

export type LinkCodesListResponse = z.infer<typeof linkCodesListResponseSchema>;

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
