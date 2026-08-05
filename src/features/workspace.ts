import { z } from 'zod';
import { homeLayoutSchema } from '../domain/home';
import { workspaceInviteSchema, workspaceSchema } from '../domain/workspace';
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
 *
 * L'espace visé n'apparaît pas dans l'entrée — il voyage sur l'enveloppe, et le
 * dispatcheur a déjà vérifié l'appartenance avant d'appeler le handler. Passer
 * par `/api/auth/me` ne conviendrait pas : cette route recalcule l'espace actif à
 * partir du favori et renverrait l'apparence de l'espace qu'*elle* choisit, pas
 * de celui vers lequel on bascule.
 */
export const workspaceActivate = {
    command: 'workspace.activate' as const,
    input: z.object({}),
    output: z.object({
        theme: themeStateSchema.nullable(),
        homeLayout: homeLayoutSchema.nullable()
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

/** Exclut un membre de l'espace actif. Réservé au propriétaire. */
export const workspaceRemoveMember = {
    command: 'workspace.removeMember' as const,
    input: z.object({ userId: z.number().int().positive() }),
    output: z.object({ userId: z.number().int().positive() })
};

/** Crée un lien d'invitation pour l'espace actif. */
export const workspaceInviteCreate = {
    command: 'workspace.inviteCreate' as const,
    input: z.object({
        /** `null` → n'expire jamais. */
        ttlSeconds: z
            .number()
            .int()
            .positive()
            .max(30 * 24 * 3600)
            .nullable(),
        /** `null` → usages illimités. */
        maxUses: z.number().int().positive().max(100).nullable()
    }),
    output: z.object({ invite: workspaceInviteSchema })
};

/** Liens encore utilisables de l'espace actif. */
export const workspaceInviteList = {
    command: 'workspace.inviteList' as const,
    input: z.object({}),
    output: z.object({ invites: z.array(workspaceInviteSchema) })
};

export const workspaceInviteRevoke = {
    command: 'workspace.inviteRevoke' as const,
    input: z.object({ token: z.string().min(1) }),
    output: z.object({ token: z.string().min(1) })
};

/**
 * Décrit une invitation sans la consommer, pour que l'écran d'acceptation
 * annonce l'espace rejoint. N'exige aucune appartenance — c'est justement le cas
 * de quelqu'un qui n'est pas encore membre.
 */
export const workspaceInvitePreview = {
    command: 'workspace.invitePreview' as const,
    input: z.object({ token: z.string().min(1) }),
    output: z.object({
        workspaceName: z.string(),
        /** Déjà membre : accepter serait un no-op, l'UI le dit plutôt que d'échouer. */
        alreadyMember: z.boolean()
    })
};

/** Consomme une invitation et rejoint l'espace. */
export const workspaceInviteAccept = {
    command: 'workspace.inviteAccept' as const,
    input: z.object({ token: z.string().min(1) }),
    output: z.object({ workspace: workspaceSchema })
};

/**
 * État de la clé d'espace : déjà active, applicable, et ce qui l'empêcherait.
 */
export const workspaceSharedKeyStatus = {
    command: 'workspace.sharedKeyStatus' as const,
    input: z.object({}),
    output: z.object({
        /** L'espace utilise déjà sa propre clé. */
        enabled: z.boolean(),
        /** Faux pour un espace personnel, qui garde la clé de son propriétaire. */
        applicable: z.boolean(),
        /** Obstacles à lever avant conversion, rédigés pour l'utilisateur. */
        blockers: z.array(z.string())
    })
};

/**
 * Convertit l'espace vers sa propre clé. Exige le propriétaire, session
 * déverrouillée : le contenu existant doit être relu avec sa clé avant d'être
 * réécrit sous celle de l'espace.
 */
export const workspaceEnableSharedKey = {
    command: 'workspace.enableSharedKey' as const,
    input: z.object({}),
    output: z.object({ converted: z.number().int().nonnegative() })
};

export const workspaceCommands = [
    workspaceSharedKeyStatus,
    workspaceEnableSharedKey,
    workspaceRename,
    workspaceLeave,
    workspaceRemoveMember,
    workspaceInviteCreate,
    workspaceInviteList,
    workspaceInviteRevoke,
    workspaceInvitePreview,
    workspaceInviteAccept,
    workspaceAdd,
    workspaceDelete,
    workspaceActivate,
    workspaceSetFavorite
] as const;
