import { z } from 'zod';

/**
 * Où en est un projet : un état de pilotage, pas un workflow (l'avancement vit
 * dans les colonnes du kanban). Seul vocabulaire de Projets gardé ici, parce que
 * d'autres features le parlent (`ProjectUsage.status`, `sdk/providers.ts`).
 */
export const projectStatusSchema = z.enum(['draft', 'active', 'paused', 'done']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
