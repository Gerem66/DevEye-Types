import { z } from 'zod';

/**
 * Où en est un projet. Volontairement court : c'est un état de pilotage, pas
 * un workflow, le détail de l'avancement vit dans les colonnes du kanban.
 *
 * C'est tout ce que le package garde de Projets : le vocabulaire que les
 * autres features parlent quand elles disent à quels projets un de leurs
 * éléments est rattaché (`ProjectUsage.status`, `sdk/providers.ts`). Le reste
 * du domaine (le projet, son tableau, sa frise, sa discussion, son
 * historique, ses liaisons) vit dans les contrats du module.
 */
export const projectStatusSchema = z.enum(['draft', 'active', 'paused', 'done']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
