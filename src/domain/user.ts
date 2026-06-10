import { z } from 'zod';

export const minimalUserSchema = z.object({
    id: z.number().int().nonnegative(),
    email: z.string().email(),
    username: z.string().min(1),
    avatar: z.string(),
    created: z.number().int().nonnegative()
});

export type MinimalUser = z.infer<typeof minimalUserSchema>;

export const userSchema = z.object({
    id: z.number().int().nonnegative(),
    email: z.string().email(),
    username: z.string().min(1),
    avatar: z.string(),
    settings: z.array(z.string()),
    defaultWorkspace: z.number().int().nonnegative(),
    defaultFeature: z.string().min(1),
    lastLogin: z.number().int().nonnegative(),
    created: z.number().int().nonnegative()
});

export type User = z.infer<typeof userSchema>;

/**
 * Database row shape (server-only). Mirrors columns exactly.
 */
export interface UserRow {
    id: number;
    email: string;
    username: string;
    password_hash: string;
    avatar: string;
    settings: string;
    /** Features of the user's private/personal workspace (workspace id 0). */
    features: string;
    default_workspace: number;
    default_feature: string;
    re_auth_interval: number | null;
    last_login: number;
    created: number;
}

export const defaultUser: User = {
    id: 0,
    email: '',
    username: '',
    avatar: '',
    settings: [],
    defaultWorkspace: 0,
    defaultFeature: 'profile',
    lastLogin: 0,
    created: 0
};
