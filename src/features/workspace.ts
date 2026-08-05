import { z } from 'zod';
import { homeLayoutSchema } from '../domain/home';
import { workspaceSchema } from '../domain/workspace';
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

export const workspaceCommands = [
    workspaceAdd,
    workspaceDelete,
    workspaceActivate,
    workspaceSetFavorite
] as const;
