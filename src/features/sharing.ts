import { z } from 'zod';

import {
    itemAccessSchema,
    itemGrantStateSchema,
    itemRefSchema,
    itemShareStateSchema
} from '../domain/sharing';

/**
 * Le partage d'un élément et ses restrictions par rôle. Un module transversal :
 * ces commandes prennent toujours le même couple `(feature, itemId)`.
 * L'autorisation ne peut pas être déclarative, la fonctionnalité visée étant
 * une donnée d'entrée : elle est vérifiée en tête de handler.
 */

/** Où cet élément est visible, et pourquoi il ne pourrait pas l'être. */
export const shareGet = {
    command: 'share.get' as const,
    input: itemRefSchema,
    output: itemShareStateSchema
};

/**
 * Projette (ou retire) l'élément dans un espace. Un seul espace par appel : la
 * case de l'écran est la commande, et un échec ne laisse pas les autres dans un
 * état incertain.
 */
export const shareSet = {
    command: 'share.set' as const,
    input: itemRefSchema.extend({
        workspaceId: z.number().int().positive(),
        shared: z.boolean()
    }),
    output: itemShareStateSchema
};

/**
 * Ce que chaque rôle d'un espace voit de cet élément (l'hérité et l'exception).
 * `workspaceId` absent = l'espace actif ; renseigné, n'importe quel espace où
 * l'élément est visible. L'appelant doit en être membre ; y écrire exige
 * `workspace.roles`.
 */
export const itemGrantList = {
    command: 'share.grantList' as const,
    input: itemRefSchema.extend({ workspaceId: z.number().int().positive().optional() }),
    output: itemGrantStateSchema
};

/**
 * Abaisse (ou rétablit) ce qu'un rôle peut faire sur cet élément, dans l'espace
 * visé (`workspaceId` absent = l'actif). `access: null` retire la restriction :
 * le rôle reprend ce que la fonctionnalité lui donne.
 */
export const itemGrantSet = {
    command: 'share.grantSet' as const,
    input: itemRefSchema.extend({
        workspaceId: z.number().int().positive().optional(),
        roleId: z.number().int().positive(),
        access: itemAccessSchema.nullable()
    }),
    output: itemGrantStateSchema
};

export const sharingCommands = [shareGet, shareSet, itemGrantList, itemGrantSet] as const;
