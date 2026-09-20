import { z } from 'zod';

/**
 * Où en est un projet : un état de pilotage, pas un workflow (l'avancement vit
 * dans les colonnes du kanban). Seul vocabulaire de Projets gardé ici, parce que
 * d'autres features le parlent (`ProjectUsage.status`, `sdk/providers.ts`).
 */
export const projectStatusSchema = z.enum(['draft', 'active', 'paused', 'done']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

/**
 * Les intitulés des états, pour les écrans qui parlent des projets sans être
 * Projets : la fiche d'une base, la coquille de réglages d'un élément.
 */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
    draft: 'Brouillon',
    active: 'En cours',
    paused: 'En pause',
    done: 'Terminé'
};

/** Pourquoi il n'y a rien à relier. Une raison plutôt qu'une liste vide : les deux sont structurelles. */
export const itemProjectsBlockerSchema = z.enum([
    /** Le module Projets n'est pas installé sur ce serveur. */
    'module',
    /** Un projet ne relie pas les éléments de cette fonctionnalité. */
    'feature'
]);
export type ItemProjectsBlocker = z.infer<typeof itemProjectsBlockerSchema>;

/** Un projet auquel l'élément réglé est relié, ou pourrait l'être. */
export const itemProjectSchema = z.object({
    projectId: z.number().int().positive(),
    title: z.string(),
    status: projectStatusSchema,
    /** Rangé : montré parce qu'il relie encore l'élément, jamais proposé à vide. */
    archived: z.boolean(),
    linked: z.boolean()
});
export type ItemProject = z.infer<typeof itemProjectSchema>;

/** Les projets d'un espace, tels que l'écran les groupe. */
export const itemProjectGroupSchema = z.object({
    workspaceId: z.number().int().positive(),
    workspaceName: z.string(),
    /** L'espace actif : l'écran le met en tête. */
    isActive: z.boolean(),
    /** L'espace d'origine de l'élément ; ailleurs il n'y est que projeté. */
    isHome: z.boolean(),
    /** L'appelant tient `projects: write` ici. Faux : les cases sont inertes, la liste reste lisible. */
    writable: z.boolean(),
    projects: z.array(itemProjectSchema)
});
export type ItemProjectGroup = z.infer<typeof itemProjectGroupSchema>;

/**
 * Les projets qui relient cet élément, dans chacun des espaces de l'appelant où
 * il est visible. Un espace où l'appelant n'a pas accès à Projets n'y figure
 * pas : les titres des projets d'un espace ne se lisent pas de l'extérieur.
 */
export const itemProjectsStateSchema = z.object({
    groups: z.array(itemProjectGroupSchema),
    blocker: itemProjectsBlockerSchema.nullable()
});
export type ItemProjectsState = z.infer<typeof itemProjectsStateSchema>;
