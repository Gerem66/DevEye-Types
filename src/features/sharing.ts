import { z } from 'zod';

import {
    itemAccessSchema,
    itemRefSchema,
    itemRoleGrantSchema,
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

/** Les restrictions posées sur cet élément, rôle par rôle. */
export const itemGrantList = {
    command: 'share.grantList' as const,
    input: itemRefSchema,
    output: z.object({ grants: z.array(itemRoleGrantSchema) })
};

/**
 * Abaisse (ou rétablit) ce qu'un rôle peut faire sur cet élément.
 *
 * `access: null` **retire** la restriction : le rôle reprend ce que la
 * fonctionnalité lui donne. C'est l'absence de ligne qui exprime « rien de
 * particulier », pas une valeur.
 */
export const itemGrantSet = {
    command: 'share.grantSet' as const,
    input: itemRefSchema.extend({
        roleId: z.number().int().positive(),
        access: itemAccessSchema.nullable()
    }),
    output: z.object({ grants: z.array(itemRoleGrantSchema) })
};

export const sharingCommands = [shareGet, shareSet, itemGrantList, itemGrantSet] as const;
