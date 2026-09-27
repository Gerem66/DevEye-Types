import { z } from 'zod';
import { featureMaintenanceLevelSchema, MAINTENANCE_MESSAGE_MAX } from '../domain/maintenance';
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
    created: z.number().int().nonnegative(),
    /** Un compte jetable d'un essai de bout en bout en cours, jamais une personne. */
    test: z.boolean()
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

/** Qui a fait le dernier changement, `null` depuis la base ou si le compte a disparu. */
const maintenanceAuthorSchema = z
    .object({ id: z.number().int().positive(), username: z.string() })
    .nullable();

export const adminMaintenanceSchema = z.object({
    site: z.object({
        active: z.boolean(),
        /** Le texte choisi, `null` pour celui par défaut. */
        message: z.string().nullable(),
        defaultMessage: z.string(),
        /** Le processus a démarré avec `MAINTENANCE=1`. */
        envSeeded: z.boolean(),
        updated: z.number().int().nonnegative(),
        updatedBy: maintenanceAuthorSchema
    }),
    /** Chaque module installé, ouvert ou non. */
    features: z.array(
        z.object({
            id: z.string(),
            level: featureMaintenanceLevelSchema.nullable(),
            /** Sans service de fond, l'arrêt complet n'a rien à arrêter. */
            hasService: z.boolean(),
            updated: z.number().int().nonnegative().nullable(),
            updatedBy: maintenanceAuthorSchema
        })
    )
});

export type AdminMaintenance = z.infer<typeof adminMaintenanceSchema>;

export const adminMaintenanceGet = {
    command: 'admin.maintenanceGet' as const,
    input: z.object({}),
    output: adminMaintenanceSchema
};

/** Mettre le site en maintenance déconnecte sur-le-champ tout compte non administrateur. */
export const adminMaintenanceSite = {
    command: 'admin.maintenanceSite' as const,
    input: z.object({
        active: z.boolean(),
        message: z.string().trim().min(1).max(MAINTENANCE_MESSAGE_MAX).nullable()
    }),
    output: adminMaintenanceSchema
};

/** `level: null` rouvre la feature. */
export const adminMaintenanceFeature = {
    command: 'admin.maintenanceFeature' as const,
    input: z.object({
        feature: z.string().min(1).max(64),
        level: featureMaintenanceLevelSchema.nullable()
    }),
    output: adminMaintenanceSchema
};

/** Ferme le rappel de `MAINTENANCE=1`, pour tous les administrateurs. */
export const adminMaintenanceDismissNotice = {
    command: 'admin.maintenanceDismissNotice' as const,
    input: z.object({}),
    output: z.object({})
};

export const adminCommands = [
    adminUserList,
    adminSetUserRole,
    adminSetUserStatus,
    adminDeleteUser,
    adminMaintenanceGet,
    adminMaintenanceSite,
    adminMaintenanceFeature,
    adminMaintenanceDismissNotice
] as const;
