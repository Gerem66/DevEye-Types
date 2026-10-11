import { z } from 'zod';

/**
 * Global account role. `admin` runs the instance (system pages, every device
 * of the fleet); `moderator` is a `user` who also handles what awaits a human
 * decision (reports, user feedback); `user` only manages its own things.
 */
export const userRoleSchema = z.enum(['user', 'moderator', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

/** The role opens the moderation pages: a moderator, or an administrator. */
export function canModerate(role: UserRole): boolean {
    return role === 'moderator' || role === 'admin';
}
