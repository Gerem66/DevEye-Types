import { z } from 'zod';

/**
 * Global account role. `admin` may manage every device and confirm/revoke
 * machines belonging to other users; `user` only manages its own devices.
 */
export const userRoleSchema = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;
