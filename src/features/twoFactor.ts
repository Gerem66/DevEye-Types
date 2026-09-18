import { z } from 'zod';
import { twoFactorSetupSchema, twoFactorStatusSchema } from '../domain/twoFactor';

export const twoFactorGetStatus = {
    command: 'twofa.status' as const,
    input: z.object({}),
    output: z.object({ status: twoFactorStatusSchema })
};

/** Begin enrollment: returns a fresh secret, otpauth URL and backup codes. */
export const twoFactorSetup = {
    command: 'twofa.setup' as const,
    input: z.object({}),
    output: z.object({ setup: twoFactorSetupSchema })
};

/** Confirm enrollment by verifying the first TOTP code. */
export const twoFactorEnable = {
    command: 'twofa.enable' as const,
    input: z.object({ code: z.string().min(6).max(8) }),
    output: z.object({ status: twoFactorStatusSchema })
};

/** Disable 2FA (requires a valid current code or backup code). */
export const twoFactorDisable = {
    command: 'twofa.disable' as const,
    input: z.object({ code: z.string().min(6).max(24) }),
    output: z.object({ status: twoFactorStatusSchema })
};

/**
 * Regenerate recovery codes (invalidates previous ones). Authenticated by the
 * live session — no fresh TOTP code is required, only that 2FA be enabled.
 */
export const twoFactorRegenBackup = {
    command: 'twofa.regenBackup' as const,
    input: z.object({}),
    output: z.object({ backupCodes: z.array(z.string().min(1)) })
};

export const twoFactorCommands = [
    twoFactorGetStatus,
    twoFactorSetup,
    twoFactorEnable,
    twoFactorDisable,
    twoFactorRegenBackup
] as const;
