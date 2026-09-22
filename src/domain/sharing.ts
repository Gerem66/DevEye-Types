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
    blocker: shareBlockerSchema.nullable(),
    /**
     * L'élément peut changer d'espace : sa fonctionnalité sait le re-chiffrer,
     * il est chez lui ici, et l'appelant a le droit de l'y écrire. Faux ne dit
     * pas pourquoi : c'est `share.movePreview`, une fois la cible choisie, qui
     * porte les motifs.
     */
    movable: z.boolean().default(false),
    /**
     * L'élément peut être copié ailleurs : sa fonctionnalité sait décrire ce
     * dont il est fait, et l'appelant peut le lire. Vers où, c'est l'écran qui
     * le propose : la cible peut être une autre instance, que ce serveur ignore.
     */
    copyable: z.boolean().default(false)
});
export type ItemShareState = z.infer<typeof itemShareStateSchema>;

/** Le palier d'un élément : sous la clé de l'espace, ou sous celle du mot de passe de son auteur. */
export const itemTierSchema = z.enum(['open', 'private']);

/** Ce que la SOURCE dit d'une copie, avant d'avoir rien lu. */
export const itemCopyPlanSchema = z.object({
    /** L'intitulé de l'élément, pour la confirmation ; `null` quand il est illisible d'ici. */
    label: z.string().nullable(),
    tier: itemTierSchema,
    /** Pourquoi la copie est impossible, en phrases prêtes à afficher. Vide : elle peut partir. */
    blockers: z.array(z.string()),
    /** Ce que la copie n'emportera pas, à énumérer dans la confirmation. */
    drops: z.array(z.string()),
    /**
     * Ce que la copie emporte et qu'on ne devinerait pas : un secret que la
     * destination pourra lire. Le pendant de `drops`, pour ce qui suit au lieu
     * de rester.
     */
    carries: z.array(z.string()).default([])
});
export type ItemCopyPlan = z.infer<typeof itemCopyPlanSchema>;

/** Ce que la DESTINATION dit d'une copie, avant de rien recevoir. */
export const itemCopyTargetSchema = z.object({
    workspaceName: z.string(),
    /**
     * Le palier que la copie aura là-bas. Une copie `private` devient `open`
     * dans un espace partagé, qui n'a pas de palier gardé : ses membres la liront.
     */
    tier: itemTierSchema,
    blockers: z.array(z.string())
});
export type ItemCopyTarget = z.infer<typeof itemCopyTargetSchema>;

/** Un paquet de copie découpé : de quoi le transporter, et vérifier à l'arrivée qu'il est entier. */
export const itemCopyManifestSchema = z.object({
    bytes: z.number().int().nonnegative(),
    chunks: z.number().int().positive().max(4096),
    /** Condensé du paquet entier : la destination refuse ce qui a changé en route. */
    sha256: z.string().regex(/^[0-9a-f]{64}$/)
});
export type ItemCopyManifest = z.infer<typeof itemCopyManifestSchema>;

/** Taille d'une tranche, en caractères : bien sous le plafond d'une trame. */
export const ITEM_COPY_CHUNK_CHARS = 512 * 1024;

/**
 * Une liaison que le déplacement va rompre. Une liaison ne traverse jamais un
 * espace : ce qui vise l'élément depuis celui qu'il quitte est retiré, et
 * l'écran le nomme avant de confirmer.
 */
export const itemMoveDependencySchema = z.object({
    feature: featureIdSchema,
    itemId: z.string().min(1).max(64),
    /** Son intitulé sous le codec de son espace ; « Élément disparu » si illisible. */
    label: z.string(),
    /** Pourquoi elle ne peut pas suivre, dit à la place de l'utilisateur. */
    reason: z.string()
});
export type ItemMoveDependency = z.infer<typeof itemMoveDependencySchema>;

/**
 * Ce qu'un déplacement ferait, calculé sans rien écrire. C'est le contenu du
 * popup de confirmation : ce qui l'empêche, ce qu'il détruit, ce qu'il emmène.
 */
export const itemMovePreviewSchema = z.object({
    workspaceId: z.number().int().positive(),
    workspaceName: z.string(),
    /** L'espace d'origine, nommé : la phrase du popup le cite. */
    homeWorkspaceName: z.string(),
    /**
     * L'origine est un espace partagé : ses autres membres perdront l'accès.
     * Dit plutôt que gardé, la suppression n'exigeant pas davantage.
     */
    losesSharedAccess: z.boolean(),
    /** Vide = le déplacement est possible. Sinon la première phrase est le motif affiché. */
    blockers: z.array(z.string()),
    /** Ce qui sera détruit ou retiré, nommé : projections, restrictions, historique. */
    drops: z.array(z.string()),
    /** Ce qui suit l'élément et qu'on ne devinerait pas : un secret lisible à l'arrivée. */
    carries: z.array(z.string()).default([]),
    /** Cellules chiffrées à convertir, pour annoncer l'ampleur plutôt que faire attendre. */
    rows: z.number().int().nonnegative(),
    /** Les liaisons rompues, nommées une par une. */
    dependencies: z.array(itemMoveDependencySchema)
});
export type ItemMovePreview = z.infer<typeof itemMovePreviewSchema>;

/**
 * Ce qu'un rôle peut faire sur un élément, **en surcharge** de ce que la
 * fonctionnalité lui donne : `none` masque, `read` passe en lecture seule,
 * `write` ouvre l'écriture à un rôle qui ne l'a qu'en lecture ailleurs.
 *
 * Un plancher demeure : sans au moins la LECTURE sur la fonctionnalité, aucun
 * élément n'existe pour le rôle et rien ne se surcharge. C'est ce qui garde à
 * l'écran des rôles sa réponse à « qui a accès à Uptime ? » ; sous ce plancher,
 * il faudrait parcourir tous les éléments de l'espace pour le savoir.
 */
export const itemAccessSchema = z.enum(['none', 'read', 'write']);
export type ItemAccess = z.infer<typeof itemAccessSchema>;

export const itemRoleGrantSchema = z.object({
    roleId: z.number().int().positive(),
    /** Absent de la liste = le rôle garde ce que la fonctionnalité lui donne. */
    access: itemAccessSchema
});

/**
 * Les permissions propres surchargées sur un élément : `true` accorde, `false`
 * retire, une clé absente suit la fonctionnalité. Les deux sens, contrairement
 * au niveau d'antan : confier le terminal sur UNE machine à un rôle qui ne l'a
 * pas partout est le cas qui a fait sauter la règle du « restrictif seulement ».
 */
export const itemExtraOverridesSchema = z.record(z.string().max(24), z.boolean());
export type ItemExtraOverrides = z.infer<typeof itemExtraOverridesSchema>;
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
    /** La surcharge posée sur cet élément, ou `null` : « comme la fonctionnalité ». */
    access: itemAccessSchema.nullable(),
    /** Les permissions propres que le rôle tient sur la **fonctionnalité** : l'héritage. */
    featureExtras: z.array(z.string().max(24)).default([]),
    /** Celles que cet élément-ci accorde (`true`) ou retire (`false`) au rôle. */
    extraOverrides: itemExtraOverridesSchema.default({})
});
export type ItemRoleGrantView = z.infer<typeof itemRoleGrantViewSchema>;

/** L'état des restrictions d'un élément dans **un** espace, prêt à afficher. */
export const itemGrantStateSchema = z.object({
    workspaceId: z.number().int().positive(),
    workspaceName: z.string(),
    /**
     * Les permissions propres de la fonctionnalité qui se surchargent élément par
     * élément, intitulés compris : les booléens seulement. Un choix borné n'a
     * pas d'ordre que le socle connaisse, et reste réglé sur le rôle.
     */
    extras: z.array(z.object({ key: z.string().max(24), label: z.string() })).default([]),
    roles: z.array(itemRoleGrantViewSchema)
});
export type ItemGrantState = z.infer<typeof itemGrantStateSchema>;

/**
 * La cible d'un partage ou d'une restriction. `featureIdSchema` et non l'enum
 * natif : les éléments d'un module se projettent comme ceux d'une native.
 */
export const itemRefSchema = z.object({
    feature: featureIdSchema,
    /** Texte : une feature choisit la clé de sa table, entière ou non (un appareil est un UUID). */
    itemId: z.string().min(1).max(64)
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
    item_id: string;
    home_workspace_id: number;
    shared_by_user_id: number;
    created: number;
    /** Le rang de l'élément dans l'espace qui le reçoit, propre à cet espace. */
    sort_order: number;
}

/** Ligne de `item_role_grants` (serveur uniquement). */
export interface ItemRoleGrantRow {
    workspace_id: number;
    feature: string;
    item_id: string;
    role_id: number;
    /** `null` quand la ligne n'existe que pour des permissions surchargées. */
    access: ItemAccess | null;
    /** Objet JSON `clé → booléen` des permissions surchargées ; `null` = aucune. */
    extra_overrides: string | null;
}

export { featureAccessSchema };
