import { z } from 'zod';

/** Current 2FA state for the authenticated account. */
export const twoFactorStatusSchema = z.object({
    enabled: z.boolean(),
    /** Remaining unused recovery codes (only meaningful when enabled). */
    backupCodesRemaining: z.number().int().nonnegative()
});

export type TwoFactorStatus = z.infer<typeof twoFactorStatusSchema>;

/**
 * One-time provisioning payload returned when starting 2FA setup. The secret
 * and otpauth URL are shown once; the QR code comes drawn by the server.
 */
export const twoFactorSetupSchema = z.object({
    secret: z.string().min(1),
    otpauthUrl: z.string().min(1),
    /** The otpauth URL as a PNG data URL, drawn by the server: the secret goes to no third party. */
    qrDataUrl: z.string().startsWith('data:image/png;base64,'),
    backupCodes: z.array(z.string().min(1))
});

export type TwoFactorSetup = z.infer<typeof twoFactorSetupSchema>;

export interface TwoFactorRow {
    user_id: number;
    /** TOTP secret sealed under the server key (encrypted at rest, server-readable). */
    secret_enc: string;
    enabled: number;
    created: number;
    confirmed_at: number | null;
    /** Time step of the last accepted TOTP code; a step at or before it is refused (replay). */
    last_used_counter: number | null;
}

export interface BackupCodeRow {
    id: number;
    user_id: number;
    /** HMAC-SHA256 of the normalized code under a key derived from the server key; raw codes are shown once. */
    code_hash: string;
    used_at: number | null;
    created: number;
}
