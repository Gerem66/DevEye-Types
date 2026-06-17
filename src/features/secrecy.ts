import { z } from 'zod';
import { secrecyStatusSchema } from '../domain/secrecy';

/** Current state of password-based encryption for the caller. */
export const secrecyStatus = {
    command: 'secrecy.status' as const,
    input: z.object({}),
    output: z.object({ status: secrecyStatusSchema })
};

/**
 * Unlock the DEK for this session by supplying the account password. Required
 * before reading/writing encrypted data while the feature is enabled.
 */
export const secrecyUnlock = {
    command: 'secrecy.unlock' as const,
    input: z.object({ password: z.string().min(1) }),
    output: z.object({ status: secrecyStatusSchema })
};

/**
 * Enable password-based encryption: re-wrap the DEK with a password-derived
 * key. When `recovery` is true a one-time recovery code is generated and
 * returned exactly once (it also wraps the DEK as a safety net).
 */
export const secrecyEnable = {
    command: 'secrecy.enable' as const,
    input: z.object({
        password: z.string().min(1),
        recovery: z.boolean()
    }),
    output: z.object({
        status: secrecyStatusSchema,
        /** Present only when `recovery` was requested. Shown once. */
        recoveryCode: z.string().min(1).optional()
    })
};

/** Disable the feature: re-wrap the DEK with the server key. */
export const secrecyDisable = {
    command: 'secrecy.disable' as const,
    input: z.object({ password: z.string().min(1) }),
    output: z.object({ status: secrecyStatusSchema })
};

/**
 * Recover access after a forgotten password using the recovery code, choosing
 * a new password to re-wrap the DEK with.
 */
export const secrecyRecover = {
    command: 'secrecy.recover' as const,
    input: z.object({
        recoveryCode: z.string().min(1),
        newPassword: z.string().min(1)
    }),
    output: z.object({ status: secrecyStatusSchema })
};

export const secrecyCommands = [
    secrecyStatus,
    secrecyUnlock,
    secrecyEnable,
    secrecyDisable,
    secrecyRecover
] as const;
