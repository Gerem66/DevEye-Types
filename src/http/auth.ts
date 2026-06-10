import { z } from 'zod';
import { userSchema } from '../domain/user';
import { workspaceSchema } from '../domain/workspace';

export const loginRequestSchema = z.object({
    username: z.string().min(1).max(120),
    password: z.string().min(1).max(512)
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/**
 * The auth flow returns the authenticated user and its workspaces in one shot.
 * Tokens are delivered as HttpOnly cookies, never in the JSON body.
 */
export const loginResponseSchema = z.object({
    user: userSchema,
    workspaces: z.array(workspaceSchema)
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

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
