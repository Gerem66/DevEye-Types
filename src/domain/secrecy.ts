import { z } from 'zod';

/**
 * Password-based encryption ("chiffrement par mot de passe").
 *
 * Uses envelope encryption: every user owns a random per-user Data Encryption
 * Key (DEK) that encrypts all their feature data. The DEK is stored *wrapped*:
 *  - mode `server`   → wrapped by the server key (feature disabled).
 *  - mode `password` → wrapped by a key derived from the user's password
 *    (Argon2id) — the server cannot read the data without the live password.
 *
 * Toggling the feature or changing the password only re-wraps the DEK; the
 * encrypted content is never rewritten.
 */
export const secrecyStatusSchema = z.object({
    /** True when the DEK is wrapped by the user's password (feature ON). */
    enabled: z.boolean(),
    /** True when the current session has unlocked the DEK in memory. */
    unlocked: z.boolean(),
    /** True when a recovery code can also unwrap the DEK (safety net). */
    recoveryEnabled: z.boolean(),
    /**
     * How long (in seconds) the password stays validated after being entered:
     * within this sliding window encrypted actions don't re-prompt. `0` means the
     * password is required for every action. `null` means the server default.
     */
    reAuthInterval: z.number().int().min(0).nullable(),
    /**
     * Epoch ms at which the grace window expires (cached DEK flushed unless
     * activity slides it forward). `null` when there is no countdown: session
     * locked, feature off, or "validate on every action" mode.
     */
    unlockedUntil: z.number().int().nullable()
});

export type SecrecyStatus = z.infer<typeof secrecyStatusSchema>;

/**
 * Pushed to every open socket of a session whenever the server caches or wipes
 * its unlocked DEK (unlock, lock, grace expiry, disconnect of a sibling tab), so
 * the client never shows a vault the server already forgot. Sliding the grace
 * window is not pushed.
 */
export const SECRECY_STATE_EVENT = 'secrecy.state' as const;
export const secrecyStatePushSchema = secrecyStatusSchema.pick({
    unlocked: true,
    unlockedUntil: true
});
export type SecrecyStatePush = z.infer<typeof secrecyStatePushSchema>;

/** How the DEK is wrapped at rest. Mirrors the `wrap_mode` SQL column. */
export const secrecyWrapModeSchema = z.enum(['server', 'password']);
export type SecrecyWrapMode = z.infer<typeof secrecyWrapModeSchema>;

/**
 * Server-only row of `user_secret_keys`. Holds the wrapped DEK and the KDF
 * material; never leaves the server. Salts are stored as raw bytes
 * (`VARBINARY`); the MySQL driver surfaces them as `Buffer`, kept loose here so
 * this shared package stays free of Node typings.
 */
export interface UserSecretKeyRow {
    user_id: number;
    dek_wrapped: string;
    /**
     * Second, distinct DEK, always wrapped by the server key — the "open" tier
     * for data that must stay readable without the password. Created lazily on
     * the first open write, so `null` until then. Unaffected by `wrap_mode`.
     */
    open_dek_wrapped: string | null;
    wrap_mode: SecrecyWrapMode;
    kdf_salt: Uint8Array | null;
    recovery_wrapped: string | null;
    recovery_salt: Uint8Array | null;
    /** Argon2id profile the password wrap was derived under; rows re-wrap to the current one on unlock. */
    version: number;
    /** Argon2id profile of the recovery wrap; upgraded when the code is next used or renewed. */
    recovery_version: number;
    created: number;
    updated: number;
}
