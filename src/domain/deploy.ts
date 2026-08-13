import { z } from 'zod';

/**
 * Les cibles de déploiement d'un espace, et l'historique de ce qu'on y a poussé.
 *
 * **Une cible appartient à l'espace, pas à un projet.** C'est le renversement
 * qui fonde cette feature, le même que celui des dépôts git : une pile compose
 * sert souvent deux projets (un client, un serveur), et la modéliser comme une
 * propriété de l'un d'eux interdisait à l'autre de la voir. Un projet n'en garde
 * donc qu'une **liaison** (`project_deploy_links`), et délier n'efface jamais la
 * cible.
 *
 * Portée volontairement **étroite** : déclencher et suivre. DevEye ne configure
 * pas le déploiement, ne gère ni domaines ni variables d'environnement — tout
 * cela vit chez le fournisseur, qui le fait mieux. Ce module répond à deux
 * questions : « est-ce que je peux lancer ça d'ici ? » et « où en est le
 * dernier ? ».
 *
 * **Toujours à l'étage ouvert**, quel que soit le tier des projets qui s'y
 * rattachent : le suivi d'état tourne sans session, et une cible d'espace ne
 * peut pas suivre le palier de confidentialité de l'un de ses projets.
 * Corollaire assumé, identique à celui des dépôts : un projet confidentiel n'a
 * pas de déploiement.
 */

export const DEPLOY_TITLE_MAX_LENGTH = 120;
export const DEPLOY_DESCRIPTION_MAX_LENGTH = 500;
export const DEPLOY_TARGET_NAME_MAX_LENGTH = 120;
export const DEPLOY_EXTERNAL_ID_MAX_LENGTH = 128;

/**
 * Les fournisseurs que le module sait déclencher.
 *
 * Un seul pour l'instant, et l'énumération est là pour que le second n'ait pas à
 * réécrire le contrat. Distinct de `credentialProviderSchema`, qui couvre aussi
 * GitHub : un jeton GitHub ne déploie rien.
 */
export const deployProviderSchema = z.enum(['dokploy']);
export type DeployProvider = z.infer<typeof deployProviderSchema>;

/**
 * L'état d'un déploiement, ramené à quatre valeurs.
 *
 * Les fournisseurs ont chacun leur vocabulaire (`done`, `success`, `idle`,
 * `error`, `failed`…). L'adaptateur les projette là-dessus, pour que
 * l'interface n'ait qu'un seul jeu d'états à connaître.
 */
export const deployStatusSchema = z.enum(['queued', 'running', 'success', 'failed']);
export type DeployStatus = z.infer<typeof deployStatusSchema>;

/**
 * Ce qu'on déploie chez Dokploy : une **application** ou une pile **compose**.
 *
 * La distinction n'est pas cosmétique — chaque type a sa propre procédure de
 * déclenchement (`application.deploy` / `compose.deploy`) et sa propre
 * procédure d'historique (`deployment.all` / `deployment.allByCompose`). Une
 * cible sans son type serait indéployable.
 *
 * En pratique, une infra Dokploy est souvent majoritairement composée de piles
 * compose : les ignorer reviendrait à ne rien pouvoir déployer.
 */
export const deployTargetKindSchema = z.enum(['application', 'compose']);
export type DeployTargetKind = z.infer<typeof deployTargetKindSchema>;

/** Une cible de l'espace, et l'état de son dernier déclenchement. */
export const deployTargetSchema = z.object({
    id: z.number().int().positive(),
    provider: deployProviderSchema,
    kind: deployTargetKindSchema,
    /** Identifiant de la cible chez le fournisseur. En clair : il porte l'unicité. */
    externalId: z.string().max(DEPLOY_EXTERNAL_ID_MAX_LENGTH),
    name: z.string().max(DEPLOY_TARGET_NAME_MAX_LENGTH),
    /** `null` = le jeton a été retiré ; la cible reste, indéployable, et le dit. */
    credentialId: z.number().int().positive().nullable(),
    /**
     * L'adresse de l'instance qui l'héberge, recopiée du jeton.
     *
     * Deux instances Dokploy peuvent servir la même pile sous le même nom ; sans
     * elle, deux lignes de la liste seraient indiscernables. Elle vient du jeton
     * et n'est jamais saisie ici.
     */
    baseUrl: z.string().nullable(),
    /** L'état du dernier déploiement, ou `null` si rien n'est jamais parti d'ici. */
    lastStatus: deployStatusSchema.nullable(),
    lastDeployAt: z.number().int().nullable(),
    /** Combien de projets la déploient. */
    projectCount: z.number().int().nonnegative(),
    created: z.number().int()
});
export type DeployTarget = z.infer<typeof deployTargetSchema>;

/** Une cible proposée au choix, telle que le fournisseur la déclare. */
export const deployCandidateSchema = z.object({
    kind: deployTargetKindSchema,
    externalId: z.string(),
    name: z.string(),
    /** Chemin lisible chez le fournisseur (projet / environnement), s'il en donne un. */
    path: z.string().nullable()
});
export type DeployCandidate = z.infer<typeof deployCandidateSchema>;

/** Un déclenchement, et ce qu'il est devenu. */
export const deploymentSchema = z.object({
    id: z.number().int().positive(),
    targetId: z.number().int().positive(),
    /** Identifiant chez le fournisseur, quand il en donne un au déclenchement. */
    externalId: z.string().nullable(),
    status: deployStatusSchema,
    /** Qui l'a déclenché ; `null` = tâche de fond, ou compte supprimé depuis. */
    triggeredByUserId: z.number().int().positive().nullable(),
    title: z.string(),
    description: z.string(),
    url: z.string().nullable(),
    startedAt: z.number().int(),
    finishedAt: z.number().int().nullable()
});
export type Deployment = z.infer<typeof deploymentSchema>;

/** Ligne SQL (serveur uniquement). */
export interface DeployTargetRow {
    id: number;
    workspace_id: number;
    credential_id: number | null;
    provider: string;
    /** 'application' | 'compose'. */
    target_kind: string;
    external_id: string;
    /** Rang dans la liste, entièrement défini par l'utilisateur (`deploy.reorder`). */
    sort_order: number;
    content: string;
    created: number;
}

/**
 * La même, augmentée de ce qu'une liste montre sans ouvrir la fiche : combien de
 * projets s'en servent, et où en est le dernier déploiement. Calculé par
 * jointure plutôt que recopié dans des colonnes, qui dériveraient.
 */
export interface DeployTargetWithUsageRow extends DeployTargetRow {
    base_url: string | null;
    project_count: number;
    last_status: string | null;
    last_deploy_at: number | null;
}

/** Ligne SQL (serveur uniquement). */
export interface DeploymentRow {
    id: number;
    target_id: number;
    workspace_id: number;
    external_id: string | null;
    status: string;
    triggered_by_user_id: number | null;
    started_at: number;
    finished_at: number | null;
    content: string;
}

/** Ligne SQL (serveur uniquement) : la liaison projet → cible. */
export interface ProjectDeployLinkRow {
    project_id: number;
    target_id: number;
    workspace_id: number;
    created: number;
}
