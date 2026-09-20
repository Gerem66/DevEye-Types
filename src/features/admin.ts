import { z } from 'zod';
import { userRoleSchema } from '../domain/role';
import { userStatusSchema } from '../domain/user';

/**
 * Administration des comptes, à l'échelle du site et non d'un espace.
 *
 * Toutes ces commandes déclarent `admin: true` côté serveur : elles sont
 * réservées au rôle global, seul niveau au-dessus des espaces.
 */

/** Un compte, tel que la page Utilisateurs l'affiche. */
export const adminUserSchema = z.object({
    id: z.number().int().positive(),
    username: z.string(),
    email: z.string(),
    avatar: z.string(),
    role: userRoleSchema,
    status: userStatusSchema,
    /** Nombre d'espaces auxquels le compte a accès, personnel compris. */
    workspaceCount: z.number().int().nonnegative(),
    lastLogin: z.number().int().nonnegative(),
    created: z.number().int().nonnegative()
});

export type AdminUser = z.infer<typeof adminUserSchema>;

export const adminUserList = {
    command: 'admin.userList' as const,
    input: z.object({}),
    output: z.object({ users: z.array(adminUserSchema) })
};

export const adminSetUserRole = {
    command: 'admin.setUserRole' as const,
    input: z.object({ userId: z.number().int().positive(), role: userRoleSchema }),
    output: z.object({ userId: z.number().int().positive(), role: userRoleSchema })
};

/** Suspendre refuse la connexion sans rien détruire : c'est réversible. */
export const adminSetUserStatus = {
    command: 'admin.setUserStatus' as const,
    input: z.object({ userId: z.number().int().positive(), status: userStatusSchema }),
    output: z.object({ userId: z.number().int().positive(), status: userStatusSchema })
};

/**
 * Supprime un compte **et tout ce qu'il possède** : son espace personnel, les
 * espaces partagés dont il est propriétaire, et leur contenu, par cascade.
 */
export const adminDeleteUser = {
    command: 'admin.deleteUser' as const,
    input: z.object({ userId: z.number().int().positive() }),
    output: z.object({ userId: z.number().int().positive() })
};

export const adminCommands = [
    adminUserList,
    adminSetUserRole,
    adminSetUserStatus,
    adminDeleteUser
] as const;
