import { z } from 'zod';
import { homeLayoutSchema } from '../domain/home';
import { workspaceSchema } from '../domain/workspace';
import {
    WORKSPACE_ROLE_NAME_MAX,
    workspaceCapabilitySchema,
    workspaceFeatureGrantSchema,
    workspacePermissionsSchema,
    workspaceRoleSchema
} from '../domain/workspaceRole';
import { themeStateSchema } from './user';

export const workspaceAdd = {
    command: 'workspace.add' as const,
    input: z.object({ name: z.string().min(1).max(120) }),
    output: z.object({ workspace: workspaceSchema })
};

export const workspaceDelete = {
    command: 'workspace.delete' as const,
    input: z.object({ workspaceId: z.number().int().positive() }),
    output: z.object({ workspaceId: z.number().int().positive() })
};

/**
 * Bascule vers un espace : renvoie son apparence et sa disposition d'accueil.
 * L'espace visé voyage sur l'enveloppe, appartenance vérifiée par le
 * dispatcheur. `/api/auth/me` ne conviendrait pas : il recalcule l'espace actif
 * à partir du favori.
 */
export const workspaceActivate = {
    command: 'workspace.activate' as const,
    input: z.object({}),
    output: z.object({
        theme: themeStateSchema.nullable(),
        homeLayout: homeLayoutSchema.nullable(),
        /** Droits dans l'espace rejoint : l'UI s'y conforme dès la bascule. */
        permissions: workspacePermissionsSchema
    })
};

/**
 * Définit (ou efface) l'espace favori du compte : celui chargé en premier à la
 * connexion. `null` → l'espace personnel.
 */
export const workspaceSetFavorite = {
    command: 'workspace.setFavorite' as const,
    input: z.object({ workspaceId: z.number().int().positive().nullable() }),
    output: z.object({ workspaceId: z.number().int().positive().nullable() })
};

/** Renomme l'espace actif. Réservé à son propriétaire. */
export const workspaceRename = {
    command: 'workspace.rename' as const,
    input: z.object({ name: z.string().min(1).max(120) }),
    output: z.object({ workspace: workspaceSchema })
};

/**
 * Quitte l'espace actif. Le propriétaire ne le peut pas : il supprime son espace
 * ou le transmet, il ne l'abandonne pas avec ses membres dedans.
 */
export const workspaceLeave = {
    command: 'workspace.leave' as const,
    input: z.object({}),
    output: z.object({ workspaceId: z.number().int().positive() })
};

/**
 * Ce qu'un départ emporte avec le membre : les projections qu'il avait réglées
 * entre cet espace et d'autres, dans les deux sens, nommées pour la
 * confirmation. Pour soi-même, ou pour un autre avec `workspace.members`.
 */
export const workspaceMemberShares = {
    command: 'workspace.memberShares' as const,
    input: z.object({ userId: z.number().int().positive() }),
    output: z.object({
        shares: z.array(z.object({ feature: z.string(), label: z.string() }))
    })
};

/** Exclut un membre de l'espace actif, et retire ses projections avec lui. */
export const workspaceRemoveMember = {
    command: 'workspace.removeMember' as const,
    input: z.object({ userId: z.number().int().positive() }),
    output: z.object({ userId: z.number().int().positive() })
};

/**
 * Invite une adresse à rejoindre l'espace actif. La réponse ne dit jamais si un
 * compte porte cette adresse : l'invitation est posée telle quelle, et c'est le
 * compte qui l'accepte (`workspace.acceptInvite`) ou la refuse.
 */
export const workspaceInvite = {
    command: 'workspace.invite' as const,
    input: z.object({ email: z.string().email() }),
    output: z.object({})
};

/** Les invitations en attente de l'espace actif, pour qui gère ses membres. */
export const workspaceInvitations = {
    command: 'workspace.invitations' as const,
    input: z.object({}),
    output: z.object({
        invitations: z.array(
            z.object({
                id: z.number().int().positive(),
                email: z.string(),
                /** Seconds. */
                expiresAt: z.number().int().nonnegative()
            })
        )
    })
};

export const workspaceCancelInvite = {
    command: 'workspace.cancelInvite' as const,
    input: z.object({ invitationId: z.number().int().positive() }),
    output: z.object({ invitationId: z.number().int().positive() })
};

/**
 * Accepte une invitation adressée à l'appelant : il devient membre de l'espace,
 * avec le rôle fixé à l'invitation. L'espace rendu est celui qu'il rejoint.
 */
export const workspaceAcceptInvite = {
    command: 'workspace.acceptInvite' as const,
    input: z.object({ invitationId: z.number().int().positive() }),
    output: z.object({ workspace: workspaceSchema })
};

export const workspaceDeclineInvite = {
    command: 'workspace.declineInvite' as const,
    input: z.object({ invitationId: z.number().int().positive() }),
    output: z.object({ invitationId: z.number().int().positive() })
};

/** Le contenu modifiable d'un rôle. */
const roleDraftSchema = z.object({
    name: z.string().min(1).max(WORKSPACE_ROLE_NAME_MAX),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    capabilities: z.array(workspaceCapabilitySchema),
    features: z.array(workspaceFeatureGrantSchema)
});

export const workspaceRoleList = {
    command: 'workspace.roleList' as const,
    input: z.object({}),
    output: z.object({
        roles: z.array(workspaceRoleSchema),
        /** Quel membre porte quel rôle. `null` = aucun, donc aucun droit. */
        memberRoles: z.array(
            z.object({
                userId: z.number().int().positive(),
                roleId: z.number().int().positive().nullable()
            })
        ),
        /** Droits effectifs de l'appelant, pour que l'UI n'affiche que l'accessible. */
        permissions: workspacePermissionsSchema
    })
};

export const workspaceRoleCreate = {
    command: 'workspace.roleCreate' as const,
    input: roleDraftSchema,
    output: z.object({ role: workspaceRoleSchema })
};

export const workspaceRoleUpdate = {
    command: 'workspace.roleUpdate' as const,
    input: roleDraftSchema.extend({ roleId: z.number().int().positive() }),
    output: z.object({ role: workspaceRoleSchema })
};

/** Refusé tant que des membres le portent : on ne révoque personne par surprise. */
export const workspaceRoleDelete = {
    command: 'workspace.roleDelete' as const,
    input: z.object({ roleId: z.number().int().positive() }),
    output: z.object({ roleId: z.number().int().positive() })
};

/** Désigne le rôle attribué d'office à qui rejoint l'espace. */
export const workspaceRoleSetDefault = {
    command: 'workspace.roleSetDefault' as const,
    input: z.object({ roleId: z.number().int().positive() }),
    output: z.object({ roleId: z.number().int().positive() })
};

/** Attribue un rôle à un membre. `null` le laisse sans aucun droit. */
export const workspaceAssignRole = {
    command: 'workspace.assignRole' as const,
    input: z.object({
        userId: z.number().int().positive(),
        roleId: z.number().int().positive().nullable()
    }),
    output: z.object({
        userId: z.number().int().positive(),
        roleId: z.number().int().positive().nullable()
    })
};

export const workspaceCommands = [
    workspaceRoleList,
    workspaceRoleCreate,
    workspaceRoleUpdate,
    workspaceRoleDelete,
    workspaceRoleSetDefault,
    workspaceAssignRole,
    workspaceRename,
    workspaceLeave,
    workspaceMemberShares,
    workspaceRemoveMember,
    workspaceInvite,
    workspaceInvitations,
    workspaceCancelInvite,
    workspaceAcceptInvite,
    workspaceDeclineInvite,
    workspaceAdd,
    workspaceDelete,
    workspaceActivate,
    workspaceSetFavorite
] as const;
