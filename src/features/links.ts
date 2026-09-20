import { z } from 'zod';

import { itemProjectsStateSchema } from '../domain/project';
import { itemRefSchema } from '../domain/sharing';

/**
 * Ce qui relie un élément d'espace aux projets qui l'utilisent, réglé depuis
 * les réglages de l'élément. Transversal comme `share.*` : le couple
 * `(feature, itemId)` est une donnée d'entrée, et le geste porte sur un espace
 * qui n'est pas forcément l'actif, ce qu'aucune commande de module ne peut
 * faire. Les liaisons restent celles de Projets, qui les tient par son contrat
 * d'usage.
 */

/** Les projets qui relient cet élément, espace par espace. */
export const projectLinksGet = {
    command: 'links.projectsGet' as const,
    input: itemRefSchema,
    output: itemProjectsStateSchema
};

/**
 * Attache l'élément à un projet, ou l'en retire. Un seul projet par appel : la
 * case de l'écran est la commande, et un échec ne laisse pas les autres dans un
 * état incertain.
 */
export const projectLinksSet = {
    command: 'links.projectsSet' as const,
    input: itemRefSchema.extend({
        workspaceId: z.number().int().positive(),
        projectId: z.number().int().positive(),
        linked: z.boolean()
    }),
    output: itemProjectsStateSchema
};

export const linksCommands = [projectLinksGet, projectLinksSet] as const;
