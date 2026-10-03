import { z } from 'zod';

/**
 * La part PUBLIQUE du vocabulaire CloudSync : ce que le protocole agent
 * transporte (scan, index, progression, état de partage) et rien d'autre.
 *
 * Le reste du domaine CloudSync (partages, versions, instantanés, lignes SQL)
 * vit dans le module privé deveye-feature-cloudsync : seul le fil, parlé par
 * l'agent public et poussé aux navigateurs, appartient au contrat publié.
 */
/** Bornes partagées serveur/agent/client. */
export const SYNC_REL_PATH_MAX = 1024;
export const SYNC_STORAGE_PATH_MAX = 1024;
/** Taille max d'un chunk base64 sur le fil (≈ 1 Mo de binaire). */
export const SYNC_CHUNK_MAX = 1_400_000;
/** Nombre max d'entrées d'index par frame `sync.index`. */
export const SYNC_INDEX_BATCH_MAX = 500;
/**
 * Séparateur des champs d'une ligne d'empreinte d'index (voir
 * `src/cloudSync/fingerprint.ts` côté serveur et `sync::fingerprint` côté
 * agent). U+0001 est sûr : les caractères de contrôle sont déjà refusés dans un
 * chemin par `relPathProblem` / `rel_path_problem`, des deux côtés.
 */
export const SYNC_FINGERPRINT_SEP = '\u0001';
/**
 * Mode de scan demandé à l'agent.
 *  - `auto` → l'agent a le droit de répondre « rien n'a bougé » sans parcourir
 *    le disque, en se contentant d'annoncer l'empreinte de ce qu'il détient ;
 *  - `full` → parcours complet obligatoire (filet de sécurité horaire).
 */
export const syncScanModeSchema = z.enum(['auto', 'full']);
export type SyncScanMode = z.infer<typeof syncScanModeSchema>;
/**
 * Empreinte d'un index : `{nombre}.{octets}.{sha256hex}`. Le pli est un XOR des
 * hachages par ligne, donc INDÉPENDANT DE L'ORDRE, à dessein : un tri obligerait
 * Rust (ordre octet UTF-8) et TypeScript (ordre unité UTF-16) à s'accorder sur
 * les caractères hors BMP, ce qu'ils ne font pas.
 */
export const syncIndexFingerprintSchema = z.string().regex(/^\d+\.\d+\.[0-9a-f]{64}$/);
/** SHA-256 hexadécimal (du clair d'un fichier, ou d'un chemin normalisé). */
export const sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const syncShareStatusSchema = z.enum(['active', 'paused']);
export type SyncShareStatus = z.infer<typeof syncShareStatusSchema>;
export const syncSessionStateSchema = z.enum([
    'scanning',
    'planning',
    'transferring',
    'done',
    'error',
    'cancelled'
]);
export type SyncSessionState = z.infer<typeof syncSessionStateSchema>;
/**
 * Nature d'une entrée d'index. Seuls les dossiers VIDES sont indexés comme
 * `dir` : un dossier peuplé est implicite (ses fichiers le recréent partout).
 * Sans ça, un dossier vide créé sur une machine n'existerait sur aucune autre,
 * et un dossier vidé resterait en coquille chez les pairs.
 */
export const syncEntryKindSchema = z.enum(['file', 'dir']);
export type SyncEntryKind = z.infer<typeof syncEntryKindSchema>;
/**
 * Why the agent could not index a path. The server treats that path, and
 * anything under it, as UNKNOWN: no deletion, no upload, no download; it
 * enters neither the baseline nor the fingerprint.
 */
export const syncSkipReasonSchema = z.enum([
    'unreadable',
    'unportable',
    'symlink',
    'special',
    'nonUtf8'
]);
export type SyncSkipReason = z.infer<typeof syncSkipReasonSchema>;
/** Volumétrie d'un partage (index + versions ; tailles logiques en clair). */
export const cloudSyncShareStatsSchema = z.object({
    fileCount: z.number().int().nonnegative(),
    liveBytes: z.number().int().nonnegative(),
    versionCount: z.number().int().nonnegative(),
    versionBytes: z.number().int().nonnegative()
});
export type CloudSyncShareStats = z.infer<typeof cloudSyncShareStatsSchema>;
/** Sens du transfert en cours (du point de vue de l'appareil). */
export const syncDirectionSchema = z.enum(['up', 'down', 'delete']);
export type SyncDirection = z.infer<typeof syncDirectionSchema>;
/** Progression d'une session, poussée aux clients web abonnés (throttlée). */
export const cloudSyncProgressSchema = z.object({
    shareId: z.number().int().positive(),
    deviceId: z.uuid(),
    sessionId: z.string().max(64),
    state: syncSessionStateSchema,
    filesTotal: z.number().int().nonnegative(),
    bytesTotal: z.number().int().nonnegative(),
    filesDone: z.number().int().nonnegative(),
    bytesDone: z.number().int().nonnegative(),
    /** Fichier en cours de transfert, pour la ligne discrète de l'UI. */
    currentPath: z.string().max(SYNC_REL_PATH_MAX).nullable(),
    /** Avancement dans le fichier en cours, pour qu'un gros fichier ne fige pas la barre. */
    currentBytes: z.number().int().nonnegative(),
    currentTotal: z.number().int().nonnegative(),
    direction: syncDirectionSchema.nullable(),
    error: z.string().max(500).nullable()
});
export type CloudSyncProgress = z.infer<typeof cloudSyncProgressSchema>;
/** État agrégé d'un partage — pilote le héros « Synchronisé » de l'UI. */
export const cloudSyncShareStateSchema = z.object({
    shareId: z.number().int().positive(),
    state: z.enum(['synced', 'syncing', 'paused', 'offline', 'error']),
    /** Précision facultative (ex. nom de l'appareil hors ligne ou en erreur). */
    detail: z.string().max(200).nullable(),
    /** Volumétrie fraîche — l'en-tête de l'UI se met à jour sans re-fetch. */
    stats: cloudSyncShareStatsSchema
});
export type CloudSyncShareState = z.infer<typeof cloudSyncShareStateSchema>;
