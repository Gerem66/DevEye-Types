import { z } from 'zod';

import {
    itemAccessSchema,
    itemGrantStateSchema,
    itemRefSchema,
    itemShareStateSchema
} from '../domain/sharing';

/**
 * Le partage d'un élément et ses restrictions par rôle.
 *
 * Un module transversal plutôt qu'un jeu de commandes par fonctionnalité : ce
 * que ces commandes prennent est toujours le même couple `(feature, itemId)`, et
 * les recopier par émetteur aurait reproduit exactement ce que l'unification des
 * notifications vient de défaire.
 *
 * L'autorisation ne peut pas être déclarative — la fonctionnalité visée est une
 * **donnée d'entrée**. Elle est vérifiée en tête de handler, comme pour
 * `notify.route*` et `device.setConfig`.
 */

/** Où cet élément est visible, et pourquoi il ne pourrait pas l'être. */
export const shareGet = {
    command: 'share.get' as const,
    input: itemRefSchema,
    output: itemShareStateSchema
};

/**
 * Projette (ou retire) l'élément dans un espace.
 *
 * Un seul espace par appel : la case de l'écran est la commande, ce qui rend
 * l'échec lisible — cocher une case qui échoue ne laisse pas les autres dans un
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
 * Ce que chaque rôle d'un espace voit de cet élément — l'hérité et l'exception.
 *
 * `workspaceId` absent = l'espace actif. Renseigné, il vise n'importe quel
 * espace où l'élément est visible : c'est ce qui permet de régler, depuis
 * l'onglet Partage du domicile, ce que chaque fenêtre montre — sans changer
 * d'espace. L'appelant doit être membre de l'espace visé ; y **écrire** exige
 * d'y tenir `workspace.roles`.
 */
export const itemGrantList = {
    command: 'share.grantList' as const,
    input: itemRefSchema.extend({ workspaceId: z.number().int().positive().optional() }),
    output: itemGrantStateSchema
};

/**
 * Abaisse (ou rétablit) ce qu'un rôle peut faire sur cet élément, dans l'espace
 * visé (`workspaceId` absent = l'actif).
 *
 * `access: null` **retire** la restriction : le rôle reprend ce que la
 * fonctionnalité lui donne. C'est l'absence de ligne qui exprime « rien de
 * particulier », pas une valeur.
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
