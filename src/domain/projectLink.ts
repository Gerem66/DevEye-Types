import { z } from 'zod';
import { projectCardSchema } from './projectBoard';

/**
 * Ce qui relie un projet au reste de DevEye, et ce qui relie une personne à ses
 * tâches à travers tous les projets.
 *
 * Deux notions transverses réunies ici parce qu'elles répondent à la même
 * question posée dans les deux sens : « qu'est-ce qui touche ce projet ? » et
 * « qu'est-ce qui me touche, moi, dans tous les projets ? ».
 */

/**
 * Un lien vers une autre feature de DevEye.
 *
 * On ne stocke que le **type et l'identifiant** : la cible garde ses propres
 * droits, et rien d'identifiant n'a besoin d'être chiffré. Un membre qui n'a pas
 * accès à Uptime verra le lien sans pouvoir l'ouvrir — c'est la feature cible
 * qui décide, pas nous.
 */
export const projectLinkKindSchema = z.enum(['uptime', 'device', 'note']);
export type ProjectLinkKind = z.infer<typeof projectLinkKindSchema>;

export const projectLinkSchema = z.object({
    id: z.number().int().positive(),
    projectId: z.number().int().positive(),
    kind: projectLinkKindSchema,
    /** Identifiant chez la feature cible : entier pour Uptime/Notes, UUID pour un appareil. */
    targetId: z.string().max(64),
    created: z.number().int()
});
export type ProjectLink = z.infer<typeof projectLinkSchema>;

/**
 * Une tâche qui m'est attribuée, vue depuis l'extérieur de son projet.
 *
 * `masked` marque une carte d'un projet confidentiel verrouillé : elle est
 * comptée et située, mais son titre reste illisible. La faire disparaître
 * donnerait une liste de tâches fausse, ce qui est pire que de dire « il y a
 * quelque chose ici que tu ne peux pas lire maintenant ».
 */
export const myTaskSchema = z.object({
    card: projectCardSchema,
    projectId: z.number().int().positive(),
    projectTitle: z.string(),
    masked: z.boolean()
});
export type MyTask = z.infer<typeof myTaskSchema>;

/** Ligne SQL (serveur uniquement). */
export interface ProjectLinkRow {
    id: number;
    project_id: number;
    workspace_id: number;
    kind: string;
    target_id: string;
    created: number;
}
