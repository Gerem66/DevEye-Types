import { z } from 'zod';

import { featureAccessSchema, workspaceFeatureIdSchema } from './workspaceRole';

/**
 * Rendre un élément visible depuis un autre espace, **sans le déplacer**.
 *
 * ## L'invariant, avant tout le reste
 *
 * Un élément partagé **ne change jamais de clé**. Il reste chiffré sous celle de
 * son espace d'origine ; servi ailleurs, il est déchiffré avec le codec ouvert
 * de cet espace-là. C'est le prolongement direct du levier L3 de
 * `WORKSPACES.md` — « un espace résout les clés de son propriétaire » — et la
 * raison pour laquelle ce chantier ne re-chiffre rien.
 *
 * `WORKSPACES.md` §10 range **déplacer** un élément hors périmètre, précisément
 * parce que ce serait la seule opération à exiger un déchiffrement clé A puis un
 * re-chiffrement clé B sous session vivante. Partager ne l'exige pas : c'est une
 * **projection**, pas un transfert. L'élément a un seul domicile, et des
 * fenêtres ailleurs.
 *
 * ## Ce qui en découle, et qu'il faut assumer
 *
 * Seule la clé de l'étage ouvert est résoluble par le serveur seul. Un élément
 * de l'étage gardé ne peut donc pas être partagé — pas par prudence, par
 * impossibilité mécanique. Voir `shareTier` dans le registre.
 *
 * ## On ne partage qu'avec soi-même
 *
 * La liste proposée est celle des espaces **dont l'appelant est membre**. Ce
 * n'est pas une restriction d'interface mais la règle : partager vers un espace
 * où l'on n'entre pas reviendrait à y déposer une donnée sans pouvoir en
 * répondre, et à contourner l'appartenance — qui est la frontière absolue du
 * modèle (`WORKSPACES.md` §3).
 */

export const itemShareSchema = z.object({
    /** L'espace vers lequel l'élément est projeté. */
    workspaceId: z.number().int().positive(),
    workspaceName: z.string(),
    /** Faux quand c'est l'espace d'origine : il n'est pas décochable. */
    isHome: z.boolean(),
    shared: z.boolean()
});
export type ItemShare = z.infer<typeof itemShareSchema>;

/**
 * Pourquoi un élément ne peut pas être partagé, quand c'est le cas.
 *
 * Une phrase plutôt qu'un booléen : « impossible » sans raison donne à chercher
 * un réglage qui n'existe pas. Ici la cause est toujours structurelle, et la
 * dire évite qu'on la prenne pour une panne.
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
 * Ce qu'un rôle peut faire sur **un** élément.
 *
 * Volontairement **restrictif seulement** : `none` ou `read` abaissent ce que le
 * rôle a sur la fonctionnalité, jamais l'inverse. Le droit de feature reste le
 * plafond, ici comme pour les droits fins.
 *
 * L'alternative — permettre d'élever — a été écartée : l'accès effectif à une
 * fonctionnalité deviendrait « le maximum entre le rôle et le meilleur droit
 * d'élément », donc une requête de plus dans la résolution d'accès, et surtout
 * un écran des rôles qui ne dirait plus à lui seul qui voit quoi.
 */
export const itemAccessSchema = z.enum(['none', 'read']);
export type ItemAccess = z.infer<typeof itemAccessSchema>;

export const itemRoleGrantSchema = z.object({
    roleId: z.number().int().positive(),
    /** Absent de la liste = le rôle garde ce que la fonctionnalité lui donne. */
    access: itemAccessSchema
});
export type ItemRoleGrant = z.infer<typeof itemRoleGrantSchema>;

/** La cible d'un partage ou d'une restriction. */
export const itemRefSchema = z.object({
    feature: workspaceFeatureIdSchema,
    itemId: z.number().int().positive()
});
export type ItemRef = z.infer<typeof itemRefSchema>;

/**
 * Une référence qu'on voit sans pouvoir la lire.
 *
 * Le cas : un élément partagé vers B pointe une donnée de A — un compte mail, un
 * appareil, un canal d'alerte. Un membre de B qui n'est pas membre de A doit
 * **savoir que le lien existe** sans en connaître le contenu. Le masquer
 * entièrement ferait croire à un élément mal réglé ; le montrer ferait fuiter
 * l'espace d'origine.
 *
 * Il peut la **retirer** si ses droits le permettent — retirer un lien ne
 * demande pas de le lire. Il ne peut ni le voir ni le modifier.
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
