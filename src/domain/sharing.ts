import { z } from 'zod';

import { featureAccessSchema, featureIdSchema } from './workspaceRole';

/**
 * Rendre un élément visible depuis un autre espace, sans le déplacer.
 *
 * Invariant : un élément partagé ne change jamais de clé. Il reste chiffré sous
 * celle de son espace d'origine et, servi ailleurs, est déchiffré avec le codec
 * ouvert de cet espace-là (levier L3 de `WORKSPACES.md`). Partager est une
 * projection, pas un transfert. Seule la clé de l'étage ouvert étant résoluble
 * par le serveur seul, un élément de l'étage gardé ne peut pas être partagé
 * (voir `shareTier` dans le registre).
 *
 * On ne partage qu'avec les espaces dont l'appelant est membre : l'appartenance
 * est la frontière absolue du modèle (`WORKSPACES.md` §3).
 */

export const itemShareSchema = z.object({
    /** L'espace vers lequel l'élément est projeté. */
    workspaceId: z.number().int().positive(),
    workspaceName: z.string(),
    /** Faux quand c'est l'espace d'origine : il n'est pas décochable. */
    isHome: z.boolean(),
    shared: z.boolean(),
    /**
     * L'appelant peut régler d'ici ce que chaque rôle de cet espace voit de
     * l'élément (`share.grantList` / `share.grantSet` avec ce `workspaceId`) :
     * l'élément y est visible, l'espace est partagé et l'appelant y tient
     * `workspace.roles`.
     */
    grantsManageable: z.boolean()
});
export type ItemShare = z.infer<typeof itemShareSchema>;

/**
 * Pourquoi un élément ne peut pas être partagé. Une raison plutôt qu'un
 * booléen : la cause est toujours structurelle, et la dire évite qu'on la
 * prenne pour une panne.
 */
export const shareBlockerSchema = z.enum([
    /** La fonctionnalité entière vit à l'étage gardé, ou n'a pas de sens ici. */
    'feature',
    /** Cet élément précis est gardé — note privée, compte mail « guarded ». */
    'item',
    /** L'appelant n'a pas le droit de partager cette fonctionnalité. */
    'forbidden',
    /**
     * L'élément vient d'un autre espace : on ne re-projette pas ce qu'on ne
     * fait que voir. Son partage se règle depuis chez lui.
     */
    'foreign'
]);
export type ShareBlocker = z.infer<typeof shareBlockerSchema>;

export const itemShareStateSchema = z.object({
    /** Les espaces de l'appelant, l'origine comprise et marquée. */
    workspaces: z.array(itemShareSchema),
    /** Renseigné quand le partage est impossible ; les cases sont alors inertes. */
    blocker: shareBlockerSchema.nullable()
});
export type ItemShareState = z.infer<typeof itemShareStateSchema>;

/**
 * Ce qu'un rôle peut faire sur un élément. Restrictif seulement : `none` ou
 * `read` abaissent ce que le rôle a sur la fonctionnalité, jamais l'inverse ;
 * le droit de feature reste le plafond, et l'écran des rôles dit à lui seul
 * qui voit quoi.
 */
export const itemAccessSchema = z.enum(['none', 'read']);
export type ItemAccess = z.infer<typeof itemAccessSchema>;

export const itemRoleGrantSchema = z.object({
    roleId: z.number().int().positive(),
    /** Absent de la liste = le rôle garde ce que la fonctionnalité lui donne. */
    access: itemAccessSchema
});
export type ItemRoleGrant = z.infer<typeof itemRoleGrantSchema>;

/**
 * Un rôle d'un espace, vu depuis l'écran des restrictions d'un élément : son
 * identité, le droit hérité de la fonctionnalité (affiché même sans exception)
 * et l'exception posée s'il y en a une.
 */
export const itemRoleGrantViewSchema = z.object({
    roleId: z.number().int().positive(),
    name: z.string(),
    color: z.string(),
    /**
     * Ce que le rôle a sur la **fonctionnalité** — le plafond, et la valeur
     * effective quand `access` est `null`.
     */
    featureAccess: z.enum(['none', 'read', 'write']),
    /** L'exception posée sur cet élément, ou `null` : « comme la fonctionnalité ». */
    access: itemAccessSchema.nullable()
});
export type ItemRoleGrantView = z.infer<typeof itemRoleGrantViewSchema>;

/** L'état des restrictions d'un élément dans **un** espace, prêt à afficher. */
export const itemGrantStateSchema = z.object({
    workspaceId: z.number().int().positive(),
    workspaceName: z.string(),
    roles: z.array(itemRoleGrantViewSchema)
});
export type ItemGrantState = z.infer<typeof itemGrantStateSchema>;

/**
 * La cible d'un partage ou d'une restriction. `featureIdSchema` et non l'enum
 * natif : les éléments d'un module se projettent comme ceux d'une native.
 */
export const itemRefSchema = z.object({
    feature: featureIdSchema,
    itemId: z.number().int().positive()
});
export type ItemRef = z.infer<typeof itemRefSchema>;

/**
 * Une référence qu'on voit sans pouvoir la lire : un élément partagé vers B
 * pointe une donnée de A (compte mail, appareil, canal). Un membre de B non
 * membre de A doit savoir que le lien existe sans en connaître le contenu ; il
 * peut le retirer si ses droits le permettent, ni le voir ni le modifier.
 */
export const foreignRefSchema = z.object({
    kind: z.literal('inaccessible'),
    /** « Compte mail d'un autre espace » — le genre, jamais l'identité. */
    label: z.string()
});
export type ForeignRef = z.infer<typeof foreignRefSchema>;

/** Ligne de `item_shares` (serveur uniquement). */
export interface ItemShareRow {
    workspace_id: number;
    feature: string;
    item_id: number;
    home_workspace_id: number;
    shared_by_user_id: number;
    created: number;
}

/** Ligne de `item_role_grants` (serveur uniquement). */
export interface ItemRoleGrantRow {
    workspace_id: number;
    feature: string;
    item_id: number;
    role_id: number;
    access: ItemAccess;
}

export { featureAccessSchema };
