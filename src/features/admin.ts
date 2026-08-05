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

/** Invitation à créer un compte, en attente d'être consommée. */
export const adminInviteSchema = z.object({
    token: z.string(),
    url: z.string(),
    /** Adresse sur laquelle l'invitation est verrouillée, ou `null`. */
    email: z.string().nullable(),
    /** Espace rejoint dès la création du compte, ou `null`. */
    workspaceName: z.string().nullable(),
    expiresAt: z.number().int().nullable(),
    maxUses: z.number().int().positive().nullable(),
    uses: z.number().int().nonnegative(),
    createdBy: z.string(),
    created: z.number().int().nonnegative()
});

export type AdminInvite = z.infer<typeof adminInviteSchema>;

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

export const adminInviteList = {
    command: 'admin.inviteList' as const,
    input: z.object({}),
    output: z.object({ invites: z.array(adminInviteSchema) })
};

export const adminInviteCreate = {
    command: 'admin.inviteCreate' as const,
    input: z.object({
        /** Verrouille l'invitation sur une adresse ; vide = ouverte. */
        email: z.string().max(320),
        /** Espace rejoint à la création du compte ; `null` = aucun. */
        workspaceId: z.number().int().positive().nullable(),
        ttlSeconds: z
            .number()
            .int()
            .positive()
            .max(30 * 24 * 3600)
            .nullable(),
        maxUses: z.number().int().positive().max(100).nullable()
    }),
    output: z.object({ invite: adminInviteSchema })
};

export const adminInviteRevoke = {
    command: 'admin.inviteRevoke' as const,
    input: z.object({ token: z.string().min(1) }),
    output: z.object({ token: z.string().min(1) })
};

export const adminCommands = [
    adminUserList,
    adminSetUserRole,
    adminSetUserStatus,
    adminDeleteUser,
    adminInviteList,
    adminInviteCreate,
    adminInviteRevoke
] as const;
