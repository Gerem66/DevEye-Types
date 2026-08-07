import { z } from 'zod';
import { userColorSchema } from './user';

/**
 * L'intégration git d'un projet : le dépôt lié, et le cache local de ce qu'on y
 * a lu (branches, commits, releases).
 *
 * **Cache, et non source de vérité** : le dépôt distant fait foi. Ce qui est
 * stocké ici sert à afficher un graphe et un historique sans rappeler l'API à
 * chaque ouverture — et à respecter le quota du fournisseur.
 *
 * Découpage clair / chiffré : `sha`, `committed_at`, `author_ref` et les
 * horodatages restent en clair (c'est ce qui rend le graphe calculable en SQL),
 * les messages, noms de branches et identités d'auteur sont chiffrés.
 */

export const PROJECT_REPO_OWNER_MAX_LENGTH = 100;
export const PROJECT_REPO_NAME_MAX_LENGTH = 100;
export const PROJECT_CREDENTIAL_LABEL_MAX_LENGTH = 64;
export const PROJECT_CREDENTIAL_SECRET_MAX_LENGTH = 512;

/** Fournisseurs adressés par le module. */
export const projectProviderSchema = z.enum(['github', 'dokploy']);
export type ProjectProvider = z.infer<typeof projectProviderSchema>;

/**
 * Un identifiant d'accès, tel que le client le voit.
 *
 * Le secret n'y figure **jamais** : seule sa présence est annoncée. Même parti
 * pris que la clé d'API météo (`hasApiKey`) — un secret qu'on ne renvoie pas
 * est un secret qui ne peut pas fuiter par une capture d'écran ou un journal.
 */
export const projectCredentialSchema = z.object({
    id: z.number().int().positive(),
    provider: projectProviderSchema,
    label: z.string().max(PROJECT_CREDENTIAL_LABEL_MAX_LENGTH),
    baseUrl: z.string().nullable(),
    hasSecret: z.boolean(),
    created: z.number().int()
});
export type ProjectCredential = z.infer<typeof projectCredentialSchema>;

/** L'état de la dernière synchronisation, tel qu'il s'affiche. */
export const projectRepoSchema = z.object({
    projectId: z.number().int().positive(),
    provider: projectProviderSchema,
    owner: z.string().max(PROJECT_REPO_OWNER_MAX_LENGTH),
    repo: z.string().max(PROJECT_REPO_NAME_MAX_LENGTH),
    credentialId: z.number().int().positive().nullable(),
    enabled: z.boolean(),
    defaultBranch: z.string().nullable(),
    lastSyncAt: z.number().int().nullable(),
    /** Message du dernier échec, ou `null` après un succès. */
    lastSyncError: z.string().nullable()
});
export type ProjectRepo = z.infer<typeof projectRepoSchema>;

export const projectBranchSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    headSha: z.string().nullable(),
    isDefault: z.boolean(),
    updatedAt: z.number().int().nullable()
});
export type ProjectBranch = z.infer<typeof projectBranchSchema>;

export const projectCommitSchema = z.object({
    id: z.number().int().positive(),
    sha: z.string(),
    message: z.string(),
    authorName: z.string(),
    authorRef: z.string(),
    /** Membre de l'espace rattaché à cet auteur git, s'il l'a été. */
    authorUserId: z.number().int().positive().nullable(),
    url: z.string().nullable(),
    committedAt: z.number().int(),
    /** Plus d'un parent = une fusion. */
    parentCount: z.number().int().nonnegative()
});
export type ProjectCommit = z.infer<typeof projectCommitSchema>;

/**
 * Un auteur git repéré dans l'historique, et son rattachement éventuel.
 *
 * `color` est la couleur retenue pour le graphe : celle du membre quand il est
 * rattaché, sinon une teinte déterministe dérivée de `authorRef` — de sorte
 * qu'un même contributeur garde la même couleur d'une session à l'autre, même
 * sans compte DevEye.
 */
export const projectCommitAuthorSchema = z.object({
    authorRef: z.string(),
    name: z.string(),
    email: z.string(),
    userId: z.number().int().positive().nullable(),
    color: userColorSchema,
    commitCount: z.number().int().nonnegative()
});
export type ProjectCommitAuthor = z.infer<typeof projectCommitAuthorSchema>;

/**
 * Un point du graphe : un commit, réduit à ce qu'il faut pour le dessiner.
 *
 * Volontairement dépouillé — pas de message ici. Le graphe en affiche des
 * milliers ; les faire voyager avec leur texte chiffré coûterait autant de
 * déchiffrements pour un rendu qui ne montre qu'un point.
 */
export const projectCommitPointSchema = z.object({
    sha: z.string(),
    committedAt: z.number().int(),
    authorRef: z.string()
});
export type ProjectCommitPoint = z.infer<typeof projectCommitPointSchema>;

export const projectReleaseSchema = z.object({
    id: z.number().int().positive(),
    tag: z.string(),
    name: z.string(),
    body: z.string(),
    url: z.string().nullable(),
    publishedAt: z.number().int(),
    isPrerelease: z.boolean()
});
export type ProjectRelease = z.infer<typeof projectReleaseSchema>;

/** Ligne SQL (serveur uniquement). */
export interface ProjectCredentialRow {
    id: number;
    workspace_id: number;
    provider: string;
    label: string;
    base_url: string | null;
    secret_enc: string;
    created: number;
}

/** Ligne SQL (serveur uniquement). */
export interface ProjectRepoRow {
    project_id: number;
    workspace_id: number;
    credential_id: number | null;
    provider: string;
    enabled: number;
    default_branch: string | null;
    last_sync_at: number | null;
    last_sync_error: string | null;
    sync_state: string | null;
    content: string;
    created: number;
}

/** Ligne SQL (serveur uniquement). */
export interface ProjectCommitRow {
    id: number;
    project_id: number;
    workspace_id: number;
    sha: string;
    committed_at: number;
    author_ref: string;
    parents: string | null;
    content: string;
}

/** Ligne SQL (serveur uniquement). */
export interface ProjectCommitAuthorRow {
    id: number;
    project_id: number;
    author_ref: string;
    workspace_id: number;
    user_id: number | null;
    content: string;
    created: number;
}

/** Ligne SQL (serveur uniquement). */
export interface ProjectBranchRow {
    id: number;
    project_id: number;
    workspace_id: number;
    name_ref: string;
    head_sha: string | null;
    is_default: number;
    updated_at: number | null;
    content: string;
}

/** Ligne SQL (serveur uniquement). */
export interface ProjectReleaseRow {
    id: number;
    project_id: number;
    workspace_id: number;
    tag_ref: string;
    published_at: number;
    is_prerelease: number;
    content: string;
}
