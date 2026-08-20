import { z } from 'zod';

/**
 * Rôles d'un espace de travail : deux dimensions volontairement distinctes.
 *
 * Les **capacités** portent sur le gouvernement de l'espace lui-même. L'enum est
 * court et fermé : il ne grandit que si la notion d'espace grandit.
 *
 * Les **droits par feature** forment une carte uniforme `feature → lecture ou
 * écriture`. Une nouvelle feature coûte une entrée dans un tableau et hérite du
 * cloisonnement lecture/écriture sans qu'aucun enum ni aucun handler ne change.
 */

export const workspaceCapabilitySchema = z.enum([
    /** Renommer l'espace, changer son logo, le supprimer. */
    'workspace.manage',
    /** Ajouter un membre par son adresse, l'exclure, lui attribuer un rôle. */
    'workspace.members',
    /** Créer, modifier, supprimer et ordonner les rôles. */
    'workspace.roles',
    /** Modifier le thème de l'espace. */
    'workspace.appearance',
    /** Modifier la disposition de l'accueil de l'espace. */
    'workspace.layout',
    /**
     * Gérer les **canaux d'alerte** de l'espace : en déclarer, corriger une
     * adresse ou une URL, en supprimer.
     *
     * Distincte des droits de fonctionnalité exprès. Un canal est une
     * destination de l'espace, partagée par tout ce qui prévient : l'adresse de
     * l'astreinte ou le salon de la production ne se confient pas à qui reçoit
     * seulement le droit de régler où Uptime écrit. Ce dernier relève de
     * `uptime: write`, et se donne donc sans celle-ci.
     */
    'workspace.notifications'
]);

export type WorkspaceCapability = z.infer<typeof workspaceCapabilitySchema>;

export const WORKSPACE_CAPABILITIES = workspaceCapabilitySchema.options;

/**
 * Features qu'un rôle peut ouvrir. Surensemble de `HomeFeatureId` : `devices`
 * s'y ajoute, parce que voir la flotte d'un espace est un droit comme un autre
 * (lecture = voir les appareils et leur supervision, écriture = les appairer,
 * approuver, renommer, supprimer).
 *
 * `monitoring` n'y figure pas : la carte d'agrégat du même nom est réservée à
 * l'administrateur global dans son espace personnel, donc aucun rôle d'espace
 * ne peut l'accorder. Les vues d'appareil, elles, relèvent de `devices`.
 */
export const workspaceFeatureIdSchema = z.enum([
    'devices',
    /**
     * Sentinelle. Distincte de `devices` exprès : voir la supervision d'une
     * machine et voir ce qu'un détecteur soupçonne d'elle ne se confondent pas.
     * `read` = consulter constats et posture, `write` = acquitter, régler les
     * cadences, relancer un relevé.
     */
    'sentinel',
    'weather',
    'password',
    'notes',
    'cloudsync',
    'uptime',
    'mail',
    'projects',
    'git',
    /**
     * Déploiement. `read` = voir les cibles de l'espace et leur historique,
     * `write` = déclarer une cible, poser la clé d'API de l'instance, et
     * **déclencher une mise en production**.
     *
     * ⚠️ Le droit le plus lourd de conséquences hors de DevEye : c'est le seul
     * qui pousse quelque chose chez un tiers. Distinct de `projects` exprès —
     * piloter le travail et livrer ne se confondent pas, et tout le monde n'a
     * pas à pouvoir faire les deux.
     */
    'deploy',
    'database',
    /**
     * Sauvegardes. Les destinations de l'espace (dossier serveur, dossier d'une
     * machine enrôlée, bucket S3) et les travaux qui y écrivent.
     *
     * `read` = voir les destinations, les travaux et leur historique, `write` =
     * déclarer une destination, poser sa clé secrète, créer un travail et le
     * déclencher.
     *
     * ⚠️ Le droit le plus lourd en lecture après `finance`, et pour une raison
     * différente: la liste des destinations dit **où sont les copies de tout**.
     * Qui la lit sait quel bucket viser pour obtenir la base entière sans jamais
     * toucher à DevEye. Distinct de `database` exprès — superviser une base et
     * savoir où en dorment les vidages ne se confondent pas.
     */
    'backup',
    /**
     * Finances. Le grand livre de l'espace: comptes, opérations, budgets,
     * échéances.
     *
     * `read` = consulter soldes, journal et tableau de bord, `write` = saisir et
     * corriger des opérations, tenir comptes, catégories, budgets et échéances.
     *
     * ⚠️ Le droit dont la lecture seule est déjà lourde: un livre de comptes dit
     * ce qu'une structure gagne, ce qu'elle doit et à qui elle paie quoi. Le
     * distinguer de `projects` n'est donc pas une commodité de rangement, c'est
     * la raison d'être de la séparation.
     */
    'finance',
    /**
     * Audience. Le suivi d'usage des sites livrés — dernier maillon de la même
     * famille que `projects`, `git` et `database` : un objet de l'**espace**
     * qu'un projet ne fait que pointer.
     *
     * `read` = consulter les statistiques, `write` = déclarer un site, changer
     * ses origines autorisées, sa rétention, le supprimer.
     *
     * ⚠️ Distinct de `projects` exprès, comme `git` l'est déjà : voir les
     * chiffres d'un site livré et piloter le travail qui le produit ne se
     * confondent pas, et tout le monde n'a pas à voir les deux.
     */
    'audience',
    /**
     * OSINT. `read` = chercher et consulter l'historique de l'espace, `write` =
     * effacer l'historique et poser les clés d'API des fournisseurs.
     */
    'osint'
]);

export type WorkspaceFeatureId = z.infer<typeof workspaceFeatureIdSchema>;

export const WORKSPACE_FEATURE_IDS = workspaceFeatureIdSchema.options;

/** `write` implique `read` : il n'existe pas d'écriture aveugle. */
export const featureAccessSchema = z.enum(['read', 'write']);
export type FeatureAccess = z.infer<typeof featureAccessSchema>;

/**
 * Un droit accordé. L'**absence** d'entrée vaut « aucun accès », et la feature
 * disparaît alors de l'interface du membre — une seule règle à retenir, et pas
 * d'état ternaire à normaliser partout.
 */
export const workspaceFeatureGrantSchema = z.object({
    feature: workspaceFeatureIdSchema,
    access: featureAccessSchema
});

export type WorkspaceFeatureGrant = z.infer<typeof workspaceFeatureGrantSchema>;

export const WORKSPACE_ROLE_NAME_MAX = 64;

export const workspaceRoleSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(WORKSPACE_ROLE_NAME_MAX),
    /** Pastille de couleur dans la liste des membres. */
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    /** Ordre d'affichage seul : aucune hiérarchie implicite entre rôles. */
    position: z.number().int().nonnegative(),
    capabilities: z.array(workspaceCapabilitySchema),
    features: z.array(workspaceFeatureGrantSchema),
    /** Attribué d'office à qui rejoint l'espace par invitation. */
    isDefault: z.boolean(),
    memberCount: z.number().int().nonnegative()
});

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

/** Ligne SQL (serveur uniquement). */
export interface WorkspaceRoleRow {
    id: number;
    workspace_id: number;
    name: string;
    color: string;
    position: number;
    /** Tableau JSON de `WorkspaceCapability`. */
    capabilities: string;
    /** Tableau JSON de `WorkspaceFeatureGrant`. */
    features: string;
    is_default: number;
    created: number;
}

/**
 * Droits effectifs de l'appelant dans l'espace actif, tels que le client les
 * reçoit pour n'afficher que ce qui est réellement accessible.
 *
 * L'interface s'en sert pour masquer, jamais pour autoriser : chaque commande
 * est de toute façon vérifiée côté serveur.
 */
export const workspacePermissionsSchema = z.object({
    isOwner: z.boolean(),
    capabilities: z.array(workspaceCapabilitySchema),
    features: z.array(workspaceFeatureGrantSchema)
});

export type WorkspacePermissions = z.infer<typeof workspacePermissionsSchema>;
