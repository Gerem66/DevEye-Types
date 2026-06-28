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
 * Hold (or release) the cached DEK for the duration of an open action popup.
 *
 * `active: true` is a heartbeat: it pins the DEK so the sliding grace window
 * cannot flush it while the user composes a long action, and must be re-sent
 * periodically — the server only honours the hold for a short lease, so if the
 * popup vanishes for *any* reason (close, navigation, crash, disconnect) the
 * heartbeats stop and the DEK reverts to a normal countdown. `active: false`
 * releases the hold and restarts a fresh grace window. The DEK can therefore
 * never linger indefinitely: only a genuinely-still-open popup keeps it alive.
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
    secrecySetReauth,
    secrecyHold,
    secrecyTouch,
    secrecyLock,
    secrecyRecover
] as const;
