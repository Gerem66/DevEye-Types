import { z } from 'zod';
import { userSchema } from '../domain/user';
import { workspaceSchema } from '../domain/workspace';

export const loginRequestSchema = z.object({
    username: z.string().min(1).max(120),
    password: z.string().min(1).max(512)
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(64)
        .regex(/^[a-zA-Z0-9_.-]+$/, 'username may only contain letters, digits, _ . -'),
    email: z.string().email().max(320),
    password: z.string().min(8).max(512)
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

/**
 * The auth flow returns the authenticated user and its workspaces in one shot.
 * Tokens are delivered as HttpOnly cookies, never in the JSON body.
 *
 * When 2FA is enabled, login first replies with `twoFactorRequired` and an
 * interim challenge token (cookie); the client then posts a TOTP/backup code.
 */
export const loginResponseSchema = z.discriminatedUnion('twoFactorRequired', [
    z.object({
        twoFactorRequired: z.literal(false),
        user: userSchema,
        workspaces: z.array(workspaceSchema)
    }),
    z.object({
        twoFactorRequired: z.literal(true)
    })
]);

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const twoFactorChallengeRequestSchema = z.object({
    /** A 6-digit TOTP code or a recovery backup code. */
    code: z.string().min(6).max(16)
});

export type TwoFactorChallengeRequest = z.infer<typeof twoFactorChallengeRequestSchema>;

export const refreshResponseSchema = z.object({
    user: userSchema,
    workspaces: z.array(workspaceSchema)
});

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const meResponseSchema = z.object({
    user: userSchema,
    workspaces: z.array(workspaceSchema)
});

export type MeResponse = z.infer<typeof meResponseSchema>;
