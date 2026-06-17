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
 * and otpauth URL are shown once; the client renders the QR code locally.
 */
export const twoFactorSetupSchema = z.object({
    secret: z.string().min(1),
    otpauthUrl: z.string().min(1),
    backupCodes: z.array(z.string().min(1))
});

export type TwoFactorSetup = z.infer<typeof twoFactorSetupSchema>;

export interface TwoFactorRow {
    user_id: number;
    /** Encrypted TOTP secret (zero-knowledge: never stored in clear). */
    secret_enc: string;
    enabled: number;
    created: number;
    confirmed_at: number | null;
}

export interface BackupCodeRow {
    id: number;
    user_id: number;
    /** SHA-256 hash of the recovery code; raw codes are shown once to the user. */
    code_hash: string;
    used_at: number | null;
    created: number;
}
