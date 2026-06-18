import { z } from 'zod';
import { userRoleSchema } from './role';
import { themeStateSchema } from '../features/user';

export const minimalUserSchema = z.object({
    id: z.number().int().nonnegative(),
    email: z.string().email(),
    username: z.string().min(1),
    avatar: z.string(),
    created: z.number().int().nonnegative()
});

export type MinimalUser = z.infer<typeof minimalUserSchema>;

/**
 * Account security posture, surfaced in the profile as "Sécurité → x / 3".
 * Each flag is one of the three main protections.
 */
export const userSecuritySchema = z.object({
    /** TOTP two-factor authentication is enabled. */
    twoFactor: z.boolean(),
    /** Password-based encryption (DEK wrapped by the user's password) is on. */
    passwordEncryption: z.boolean(),
    /**
     * Password re-validation window is configured to a strict value: enabled and
     * short enough (≤ 5 min) to count as a protection. Disabled (0) or a long
     * window does not count.
     */
    reAuthValidation: z.boolean()
});

export type UserSecurity = z.infer<typeof userSecuritySchema>;

export const userSchema = z.object({
    id: z.number().int().nonnegative(),
    email: z.string().email(),
    username: z.string().min(1),
    avatar: z.string(),
    role: userRoleSchema,
    settings: z.array(z.string()),
    security: userSecuritySchema,
    defaultWorkspace: z.number().int().nonnegative(),
    lastLogin: z.number().int().nonnegative(),
    created: z.number().int().nonnegative(),
    theme: themeStateSchema.nullable()
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
    role: string;
    settings: string;
    /** Features of the user's private/personal workspace (workspace id 0). */
    features: string;
    default_workspace: number;
    re_auth_interval: number | null;
    last_login: number;
    created: number;
    /** JSON-serialised ThemeStateDTO, or null if the user has never saved a theme. */
    theme: string | null;
}

export const defaultUser: User = {
    id: 0,
    email: '',
    username: '',
    avatar: '',
    role: 'user',
    settings: [],
    security: { twoFactor: false, passwordEncryption: false, reAuthValidation: false },
    defaultWorkspace: 0,
    lastLogin: 0,
    created: 0,
    theme: null
};
