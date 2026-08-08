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
 * Ce qui relie un projet à un service surveillé.
 *
 * On ne stocke que l'identifiant : la cible garde ses propres droits, et rien
 * d'identifiant n'a besoin d'être chiffré. Un membre sans accès à Uptime voit
 * qu'il y a des services rattachés sans pouvoir les nommer — c'est la feature
 * visée qui tranche, pas celle-ci.
 *
 * La liaison est **non exclusive dans les deux sens** : un projet suit plusieurs
 * services, et un même service peut être suivi par plusieurs projets. Même forme
 * que la liaison au dépôt git, et pour la même raison — ce sont deux objets
 * d'espace, pas des propriétés d'un projet.
 */

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
export interface ProjectUptimeLinkRow {
    project_id: number;
    service_id: number;
    workspace_id: number;
    created: number;
}
