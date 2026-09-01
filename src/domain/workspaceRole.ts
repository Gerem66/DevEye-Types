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
    'workspace.layout'
]);

export type WorkspaceCapability = z.infer<typeof workspaceCapabilitySchema>;

export const WORKSPACE_CAPABILITIES = workspaceCapabilitySchema.options;

/**
 * Features qu'un rôle peut ouvrir. `devices` en fait partie : voir la flotte
 * d'un espace est un droit comme un autre (lecture = voir les appareils et leur
 * supervision, écriture = les appairer, approuver, renommer, supprimer).
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
     * Déploiement. `read` = voir les cibles et leur historique, `write` =
     * déclarer une cible, poser la clé d'API et déclencher une mise en
     * production : le seul droit qui pousse quelque chose chez un tiers, d'où
     * sa séparation de `projects`.
     */
    'deploy',
    'database',
    /**
     * Sauvegardes. `read` = voir destinations, travaux et historique, `write` =
     * déclarer une destination, poser sa clé, créer et déclencher un travail.
     * La lecture est lourde : la liste des destinations dit où sont les copies
     * de tout, d'où sa séparation de `database`.
     */
    'backup',
    /**
     * Finances. `read` = consulter soldes, journal et tableau de bord, `write` =
     * saisir et corriger des opérations, tenir comptes, catégories, budgets et
     * échéances. La lecture seule est déjà lourde, d'où sa séparation de
     * `projects`.
     */
    'finance',
    /**
     * Audience. `read` = consulter les statistiques, `write` = déclarer un site,
     * changer ses origines autorisées, sa rétention, le supprimer. Distinct de
     * `projects`, comme `git` : un objet de l'espace qu'un projet ne fait que
     * pointer.
     */
    'audience',
    /**
     * OSINT. `read` = chercher et consulter l'historique de l'espace, `write` =
     * effacer l'historique et poser les clés d'API des fournisseurs.
     */
    'osint',
    /**
     * Veille CVE. `read` = lire le fil et chercher dans le catalogue, `write` =
     * épingler une CVE pour tout l'espace et poser la clé d'API du NVD.
     */
    'cve'
]);

export type WorkspaceFeatureId = z.infer<typeof workspaceFeatureIdSchema>;

export const WORKSPACE_FEATURE_IDS = workspaceFeatureIdSchema.options;

/**
 * Identifiant d'une feature externe (module tiers compilé dans l'app). Le
 * préfixe `x-` exclut toute collision avec les ids natifs, les sujets réservés
 * (`workspace`, `home`, `account`, `notify`) et les UUID d'appareil d'une
 * disposition (un UUID commence par un chiffre hexadécimal). Pas de tiret
 * intérieur : l'id sert tel quel de préfixe de commande (`x-crypto.list`).
 */
export const EXTERNAL_FEATURE_ID_PATTERN = /^x-[a-z][a-z0-9]{1,24}$/;

export type ExternalFeatureId = `x-${string}`;

export const externalFeatureIdSchema = z
    .string()
    .regex(EXTERNAL_FEATURE_ID_PATTERN) as unknown as z.ZodType<ExternalFeatureId>;

/**
 * Toute feature adressable par un droit : native (enum fermé) ou externe.
 *
 * Le surensemble est **pur** : chaque valeur déjà persistée (grants JSON,
 * dispositions) parse inchangée. Une valeur externe inconnue de l'installation
 * courante parse aussi : un rôle peut garder le grant d'un module retiré, il
 * reste simplement inerte tant qu'aucun module ne porte cet id.
 */
export const featureIdSchema = z.union([workspaceFeatureIdSchema, externalFeatureIdSchema]);

export type FeatureId = WorkspaceFeatureId | ExternalFeatureId;

/** Cette valeur est-elle l'id d'une feature externe ? */
export function isExternalFeatureId(id: string): id is ExternalFeatureId {
    return EXTERNAL_FEATURE_ID_PATTERN.test(id);
}

/** `write` implique `read` : il n'existe pas d'écriture aveugle. */
export const featureAccessSchema = z.enum(['read', 'write']);
export type FeatureAccess = z.infer<typeof featureAccessSchema>;

/**
 * Un droit accordé. L'**absence** d'entrée vaut « aucun accès », et la feature
 * disparaît alors de l'interface du membre — une seule règle à retenir, et pas
 * d'état ternaire à normaliser partout.
 */
export const workspaceFeatureGrantSchema = z.object({
    feature: featureIdSchema,
    access: featureAccessSchema,
    /**
     * Gérer les canaux d'alerte de cette fonctionnalité : en déclarer, corriger
     * une adresse ou une URL, en supprimer, lire leurs destinations. Distinct de
     * `access` : régler où Uptime écrit relève de `access: write` et se donne
     * sans livrer les destinations. Sans effet sur une fonctionnalité qui
     * n'émet pas de notifications.
     */
    channels: z.boolean(),
    /**
     * Régler ce que chaque rôle peut faire d'un élément pris séparément (l'onglet
     * Permissions d'un élément). Distinct de `access` : surcharger un appareil
     * n'est pas gérer la flotte, et distinct de la capacité `workspace.roles`,
     * qui gouverne les rôles eux-mêmes — on peut confier le réglage par élément
     * d'une fonctionnalité sans ouvrir l'écran des rôles.
     *
     * Ce droit-ci ne se surcharge PAS par élément, sans quoi il servirait à
     * s'accorder tout le reste. Sans effet sur une fonctionnalité sans éléments.
     */
    itemPermissions: z.boolean().default(false),
    /**
     * Permissions déclarées par la feature elle-même (`extraPermissions` du
     * manifest) : booléen pour un `toggle`, valeur d'un `choice`. Une clé
     * absente vaut « refusé » pour un toggle et « valeur par défaut du manifest »
     * pour un choix ; le propriétaire reçoit `true` / `ownerValue`. Une clé
     * inconnue du manifest est rejetée à l'écriture et ignorée à la lecture.
     */
    extras: z.record(z.string().max(24), z.union([z.boolean(), z.string().max(32)])).default({})
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
 * Une surcharge d'élément, du point de vue de l'appelant : ce que CE rôle-là
 * obtient sur cette ligne, en remplacement de ce que la fonctionnalité donne.
 */
export const itemGrantOverrideSchema = z.object({
    feature: featureIdSchema,
    itemId: z.string().min(1).max(64),
    /** `null` : le niveau suit la fonctionnalité, seules les permissions changent. */
    access: z.enum(['none', 'read', 'write']).nullable(),
    /** `true` accorde, `false` retire ; une clé absente suit la fonctionnalité. */
    extras: z.record(z.string().max(24), z.boolean()).default({})
});

export type ItemGrantOverride = z.infer<typeof itemGrantOverrideSchema>;

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
    features: z.array(workspaceFeatureGrantSchema),
    /**
     * Les surcharges posées sur des éléments précis pour le rôle de l'appelant.
     * Elles voyagent avec ses droits parce que l'interface en a besoin élément
     * par élément — griser le terminal d'UNE machine, ouvrir l'écriture sur une
     * autre — et que `features` seule ne peut pas y répondre. Seules les
     * exceptions y figurent ; l'absence vaut « comme la fonctionnalité ».
     */
    itemOverrides: z.array(itemGrantOverrideSchema).default([])
});

export type WorkspacePermissions = z.infer<typeof workspacePermissionsSchema>;
