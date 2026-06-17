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
    recoveryEnabled: z.boolean()
});

export type SecrecyStatus = z.infer<typeof secrecyStatusSchema>;

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
    wrap_mode: SecrecyWrapMode;
    kdf_salt: Uint8Array | null;
    recovery_wrapped: string | null;
    recovery_salt: Uint8Array | null;
    version: number;
    created: number;
    updated: number;
}
