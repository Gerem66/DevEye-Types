import { z } from 'zod';
import { seatCapsSchema } from '../domain/admission';
import { externalServiceSchema } from '../domain/externalService';
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
        /** Le processus a démarré avec `MAINTENANCE=true`. */
        envSeeded: z.boolean(),
        updated: z.number().int().nonnegative(),
        updatedBy: maintenanceAuthorSchema
    }),
    /** La priorité aux abonnés, commune à tous les serveurs qui partagent la base. */
    priority: z.object({
        active: z.boolean(),
        /** Sans module qui tient les offres, personne n'est abonné : rien à activer. */
        available: z.boolean(),
        updated: z.number().int().nonnegative().nullable(),
        updatedBy: maintenanceAuthorSchema
    }),
    /** Les inscriptions de ce serveur seulement, rangées par origine publique. */
    signups: z.object({
        open: z.boolean(),
        origin: z.string(),
        updated: z.number().int().nonnegative().nullable(),
        updatedBy: maintenanceAuthorSchema
    }),
    /** Les places simultanées de ce serveur seulement, et qui les occupe à l'instant. */
    seats: seatCapsSchema.extend({
        origin: z.string(),
        updated: z.number().int().nonnegative().nullable(),
        updatedBy: maintenanceAuthorSchema,
        present: z.object({
            free: z.number().int().nonnegative(),
            paid: z.number().int().nonnegative()
        }),
        waiting: z.object({
            free: z.number().int().nonnegative(),
            paid: z.number().int().nonnegative()
        })
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

/**
 * Les comptes sans offre prioritaire restent connectés, mais tout ce qui tourne
 * pour eux se met en pause et ils ne créent plus rien, jusqu'à la levée.
 */
export const adminMaintenancePriority = {
    command: 'admin.maintenancePriority' as const,
    input: z.object({ active: z.boolean() }),
    output: adminMaintenanceSchema
};

export const adminMaintenanceSignups = {
    command: 'admin.maintenanceSignups' as const,
    input: z.object({ open: z.boolean() }),
    output: adminMaintenanceSchema
};

/** Baisser un plafond ne ferme aucune session : les suivants attendent. */
export const adminMaintenanceSeats = {
    command: 'admin.maintenanceSeats' as const,
    input: seatCapsSchema,
    output: adminMaintenanceSchema
};

/** Ferme le rappel de `MAINTENANCE=true`, pour tous les administrateurs. */
export const adminMaintenanceDismissNotice = {
    command: 'admin.maintenanceDismissNotice' as const,
    input: z.object({}),
    output: z.object({})
};

const seatUseSchema = z.object({
    /** `null`: no cap. */
    cap: z.number().int().positive().nullable(),
    present: z.number().int().nonnegative(),
    waiting: z.number().int().nonnegative()
});

/** The "Services externes" page: every external dependency of the instance, then this server's seats. */
export const adminExternalServicesSchema = z.object({
    services: z.array(externalServiceSchema),
    /** This server's simultaneous seats, the only limit on how many accounts it serves at once. */
    seats: z.object({ free: seatUseSchema, paid: seatUseSchema }),
    /** Milliseconds: when the services were last checked. */
    checkedAt: z.number().int().nonnegative()
});
export type AdminExternalServices = z.infer<typeof adminExternalServicesSchema>;

/** `refresh`: check again now rather than answer the last check (kept a few minutes). */
export const adminExternalServices = {
    command: 'admin.externalServices' as const,
    input: z.object({ refresh: z.boolean() }),
    output: adminExternalServicesSchema
};

export const adminCommands = [
    adminUserList,
    adminSetUserRole,
    adminSetUserStatus,
    adminDeleteUser,
    adminMaintenanceGet,
    adminMaintenanceSite,
    adminMaintenanceFeature,
    adminMaintenancePriority,
    adminMaintenanceSignups,
    adminMaintenanceSeats,
    adminMaintenanceDismissNotice,
    adminExternalServices
] as const;
