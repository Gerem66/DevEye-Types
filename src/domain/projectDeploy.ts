import { z } from 'zod';
import { projectProviderSchema } from './projectGit';

/**
 * Le déploiement d'un projet : l'application visée, et l'historique des
 * déclenchements.
 *
 * Portée volontairement **étroite** : déclencher et suivre. DevEye ne configure
 * pas le déploiement, ne le paramètre pas, ne gère ni domaines ni variables
 * d'environnement — tout cela vit chez le fournisseur, qui le fait mieux. Ce
 * module répond à deux questions : « est-ce que je peux lancer ça d'ici ? » et
 * « où en est le dernier ? ».
 */

export const PROJECT_DEPLOY_TITLE_MAX_LENGTH = 120;
export const PROJECT_DEPLOY_DESCRIPTION_MAX_LENGTH = 500;

/**
 * L'état d'un déploiement, ramené à quatre valeurs.
 *
 * Les fournisseurs ont chacun leur vocabulaire (`done`, `success`, `idle`,
 * `error`, `failed`…). L'adaptateur les projette là-dessus, pour que
 * l'interface n'ait qu'un seul jeu d'états à connaître.
 */
export const deployStatusSchema = z.enum(['queued', 'running', 'success', 'failed']);
export type DeployStatus = z.infer<typeof deployStatusSchema>;

/** L'application liée au projet chez le fournisseur. */
export const projectDeployTargetSchema = z.object({
    projectId: z.number().int().positive(),
    provider: projectProviderSchema,
    /** Identifiant de l'application chez le fournisseur. */
    externalId: z.string(),
    name: z.string(),
    credentialId: z.number().int().positive().nullable()
});
export type ProjectDeployTarget = z.infer<typeof projectDeployTargetSchema>;

/** Une application proposée au choix, telle que le fournisseur la liste. */
export const deployCandidateSchema = z.object({
    externalId: z.string(),
    name: z.string(),
    /** Chemin lisible chez le fournisseur (projet / environnement), s'il en donne un. */
    path: z.string().nullable()
});
export type DeployCandidate = z.infer<typeof deployCandidateSchema>;

export const projectDeploymentSchema = z.object({
    id: z.number().int().positive(),
    provider: projectProviderSchema,
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
export type ProjectDeployment = z.infer<typeof projectDeploymentSchema>;

/** Ligne SQL (serveur uniquement). */
export interface ProjectDeployTargetRow {
    project_id: number;
    workspace_id: number;
    credential_id: number | null;
    provider: string;
    external_id: string;
    created: number;
    content: string;
}

/** Ligne SQL (serveur uniquement). */
export interface ProjectDeploymentRow {
    id: number;
    project_id: number;
    workspace_id: number;
    provider: string;
    external_id: string | null;
    status: string;
    triggered_by_user_id: number | null;
    started_at: number;
    finished_at: number | null;
    content: string;
}
