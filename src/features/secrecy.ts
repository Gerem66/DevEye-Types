import { z } from 'zod';
import { secrecyStatusSchema } from '../domain/secrecy';
import { passwordSchema } from '../http/auth';

/** A password being verified: whatever the account already has. Bounded so Argon2 never eats a megabyte. */
const existingPassword = z.string().min(1).max(512);
const newPassword = passwordSchema;

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
    input: z.object({ password: existingPassword }),
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
        password: existingPassword,
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
    input: z.object({ password: existingPassword }),
    output: z.object({ status: secrecyStatusSchema })
};

/**
 * Set how long the password stays validated after entry (the "sudo-like" grace
 * window), in seconds. `0` disables it: the password is then required for every
 * encrypted action. Bounded to a day to keep the window meaningful.
 */
export const secrecySetReauth = {
    command: 'secrecy.setReauth' as const,
    input: z.object({ seconds: z.number().int().min(0).max(86400) }),
    output: z.object({ status: secrecyStatusSchema })
};

/**
 * Hold (or release) the cached DEK while an action popup is open. `active:
 * true` is a heartbeat: the server honours the hold for a short lease only, so
 * if the popup vanishes for any reason the DEK reverts to a normal countdown.
 * `active: false` releases the hold and restarts a fresh grace window.
 */
export const secrecyHold = {
    command: 'secrecy.hold' as const,
    input: z.object({ active: z.boolean() }),
    output: z.object({ status: secrecyStatusSchema })
};

/**
 * Slide the grace window forward by one full interval, as if an encrypted action
 * had just happened — used by the topbar timer widget to let the user manually
 * postpone the password flush. No-op when locked or when the feature is off.
 */
export const secrecyTouch = {
    command: 'secrecy.touch' as const,
    input: z.object({}),
    output: z.object({ status: secrecyStatusSchema })
};

/**
 * Immediately flush the cached DEK for this session, re-locking the vault so the
 * next encrypted action re-prompts — the manual counterpart to {@link secrecyTouch},
 * letting the user force a re-lock ahead of the grace window. No-op when already
 * locked or when the feature is off.
 */
export const secrecyLock = {
    command: 'secrecy.lock' as const,
    input: z.object({}),
    output: z.object({ status: secrecyStatusSchema })
};

/**
 * Recover access after a forgotten password using the recovery code, choosing
 * a new password to re-wrap the DEK with. The code that served is replaced: the
 * new one is returned exactly once. Every other session of the account closes.
 */
export const secrecyRecover = {
    command: 'secrecy.recover' as const,
    input: z.object({
        recoveryCode: z.string().min(1).max(64),
        newPassword
    }),
    output: z.object({ status: secrecyStatusSchema, recoveryCode: z.string().min(1) })
};

/** Replace the recovery code (password required). The previous code stops working at once. */
export const secrecyRegenerateRecovery = {
    command: 'secrecy.regenerateRecovery' as const,
    input: z.object({ password: existingPassword }),
    output: z.object({ status: secrecyStatusSchema, recoveryCode: z.string().min(1) })
};

export const secrecyCommands = [
    secrecyStatus,
    secrecyUnlock,
    secrecyEnable,
    secrecyDisable,
    secrecySetReauth,
    secrecyHold,
    secrecyTouch,
    secrecyLock,
    secrecyRecover,
    secrecyRegenerateRecovery
] as const;
