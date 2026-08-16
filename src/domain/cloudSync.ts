import { z } from 'zod';

/**
 * CloudSync — synchronisation de dossier type « Synology Drive ».
 *
 * Un *partage* (share) est un dossier « cloud » géré par le serveur : les
 * contenus vivent dans un blob store chiffré (clé serveur), adressés par le
 * SHA-256 de leur clair ; l'arborescence n'existe que dans l'index SQL. Chaque
 * appareil attaché maintient un dossier local en miroir via l'agent.
 *
 * Invariant absolu : rien n'est jamais détruit sans qu'une *version* de
 * sauvegarde vérifiée par hash existe déjà côté serveur. Les suppressions se
 * propagent, mais passent toujours par l'archivage d'abord.
 *
 * Les `mtime` de fichiers sont en millisecondes unix (précision requise pour
 * le last-writer-wins) ; les horodatages de lignes (`created`/`updated`) en
 * secondes unix, comme partout ailleurs.
 */

/** Bornes partagées serveur/agent/client. */
export const SYNC_REL_PATH_MAX = 1024;
export const SYNC_PATTERN_MAX = 512;
export const SYNC_NAME_MAX = 120;
export const SYNC_STORAGE_PATH_MAX = 1024;
/** Taille max d'un chunk base64 sur le fil (≈ 1 Mo de binaire). */
export const SYNC_CHUNK_MAX = 1_400_000;
/** Nombre max d'entrées d'index par frame `sync.index`. */
export const SYNC_INDEX_BATCH_MAX = 500;
/** Tolérance de dérive d'horloge pour le last-writer-wins (ms). */
export const SYNC_MTIME_SKEW_MS = 5_000;

/**
 * Déchets d'OS jamais synchronisés (comportement Synology/Syncthing). Le
 * serveur les ajoute comme exclusions `name` implicites (merge, cleanup ET
 * config poussée aux agents) — une seule source de vérité, ici.
 */
export const SYNC_DEFAULT_IGNORED_NAMES = ['.DS_Store', 'Thumbs.db', 'desktop.ini'] as const;

/** SHA-256 hexadécimal (du clair d'un fichier, ou d'un chemin normalisé). */
export const sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const syncShareStatusSchema = z.enum(['active', 'paused']);
export type SyncShareStatus = z.infer<typeof syncShareStatusSchema>;

/**
 * Type d'exclusion :
 *  - `path`  → chemin relatif exact (fichier ou préfixe de dossier),
 *  - `name`  → nom exact d'un composant de chemin (ex. `node_modules`),
 *  - `regex` → expression régulière sur le chemin relatif (moteur linéaire).
 */
export const syncExclusionKindSchema = z.enum(['path', 'name', 'regex']);
export type SyncExclusionKind = z.infer<typeof syncExclusionKindSchema>;

/** Pourquoi une version a été archivée (toujours AVANT la destruction). */
export const syncVersionReasonSchema = z.enum([
    'overwrite',
    'delete',
    'conflict',
    'restore',
    'excluded'
]);
export type SyncVersionReason = z.infer<typeof syncVersionReasonSchema>;

/** Ordre de tri des sauvegardes (le tri est serveur : la pagination le suit). */
export const syncVersionSortSchema = z.enum(['newest', 'oldest', 'largest', 'path']);
export type SyncVersionSort = z.infer<typeof syncVersionSortSchema>;

/**
 * Politique de conflit (modifié des deux côtés) :
 *  - `newest` → last-writer-wins par mtime, le perdant est archivé en version ;
 *  - `rename` → les DEUX contenus restent vivants : le perdant est renommé
 *    `<nom> (conflit AAAA-MM-JJ HH-MM-SS).<ext>` et se propage partout.
 */
export const syncConflictPolicySchema = z.enum(['newest', 'rename']);
export type SyncConflictPolicy = z.infer<typeof syncConflictPolicySchema>;

export const syncSessionStateSchema = z.enum([
    'scanning',
    'planning',
    'transferring',
    'done',
    'error',
    'cancelled'
]);
export type SyncSessionState = z.infer<typeof syncSessionStateSchema>;

/** État d'un fichier dans l'index canonique du partage. */
export const syncFileStateSchema = z.enum(['present', 'deleted']);
export type SyncFileState = z.infer<typeof syncFileStateSchema>;

/**
 * Nature d'une entrée d'index. Seuls les dossiers VIDES sont indexés comme
 * `dir` : un dossier peuplé est implicite (ses fichiers le recréent partout).
 * Sans ça, un dossier vide créé sur une machine n'existerait sur aucune autre,
 * et un dossier vidé resterait en coquille chez les pairs.
 */
export const syncEntryKindSchema = z.enum(['file', 'dir']);
export type SyncEntryKind = z.infer<typeof syncEntryKindSchema>;

/** SHA-256 du contenu vide : le hash conventionnel porté par une entrée `dir`. */
export const SYNC_DIR_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export const cloudSyncExclusionSchema = z.object({
    id: z.number().int().positive(),
    kind: syncExclusionKindSchema,
    pattern: z.string().min(1).max(SYNC_PATTERN_MAX)
});
export type CloudSyncExclusion = z.infer<typeof cloudSyncExclusionSchema>;

/** Un appareil attaché à un partage, avec son dossier local. */
export const cloudSyncShareDeviceSchema = z.object({
    deviceId: z.uuid(),
    deviceName: z.string(),
    localPath: z.string().max(SYNC_STORAGE_PATH_MAX),
    status: syncShareStatusSchema,
    online: z.boolean(),
    /** Fin de la dernière session réussie, secondes unix ; null si jamais. */
    lastSyncAt: z.number().int().nonnegative().nullable()
});
export type CloudSyncShareDevice = z.infer<typeof cloudSyncShareDeviceSchema>;

/** Volumétrie d'un partage (index + versions ; tailles logiques en clair). */
export const cloudSyncShareStatsSchema = z.object({
    fileCount: z.number().int().nonnegative(),
    liveBytes: z.number().int().nonnegative(),
    versionCount: z.number().int().nonnegative(),
    versionBytes: z.number().int().nonnegative()
});
export type CloudSyncShareStats = z.infer<typeof cloudSyncShareStatsSchema>;

export const cloudSyncShareSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(SYNC_NAME_MAX),
    storagePath: z.string().min(1).max(SYNC_STORAGE_PATH_MAX),
    status: syncShareStatusSchema,
    /** Purge auto des versions les plus vieilles au-delà du budget (défaut : off). */
    backupPruneEnabled: z.boolean(),
    /** Budget de versions en octets ; null = illimité. */
    backupLimitBytes: z.number().int().positive().nullable(),
    /** Points de restauration automatiques du partage entier. */
    snapshotEnabled: z.boolean(),
    snapshotIntervalHours: z
        .number()
        .int()
        .positive()
        .max(24 * 7),
    snapshotKeepDays: z.number().int().positive().max(3650),
    /** Balayage d'intégrité de fond (relecture + vérification des blobs). */
    integrityScanEnabled: z.boolean(),
    /** Limites de bande passante en octets/s ; `null` = illimité (défaut). */
    rateUpBps: z.number().int().positive().nullable(),
    rateDownBps: z.number().int().positive().nullable(),
    /** Rétention de la corbeille locale des appareils, en jours. */
    trashKeepDays: z.number().int().positive().max(3650),
    conflictPolicy: syncConflictPolicySchema,
    stats: cloudSyncShareStatsSchema,
    devices: z.array(cloudSyncShareDeviceSchema),
    exclusions: z.array(cloudSyncExclusionSchema)
});
export type CloudSyncShare = z.infer<typeof cloudSyncShareSchema>;

/** Une entrée de l'index canonique, telle que naviguée depuis le client. */
export const cloudSyncFileSchema = z.object({
    relPath: z.string().max(SYNC_REL_PATH_MAX),
    kind: syncEntryKindSchema,
    hash: sha256HexSchema,
    size: z.number().int().nonnegative(),
    /** Millisecondes unix. */
    mtime: z.number().int().nonnegative(),
    mode: z.number().int().nullable(),
    state: syncFileStateSchema,
    /** Secondes unix. */
    updated: z.number().int().nonnegative()
});
export type CloudSyncFile = z.infer<typeof cloudSyncFileSchema>;

/**
 * Origine d'un point de restauration :
 *  - `auto`       — pris par l'entretien horaire quand l'index a bougé ;
 *  - `manual`     — demandé depuis l'interface ;
 *  - `preRestore` — pris juste AVANT une restauration, ce qui la rend annulable.
 */
export const syncSnapshotKindSchema = z.enum(['auto', 'manual', 'preRestore']);
export type SyncSnapshotKind = z.infer<typeof syncSnapshotKindSchema>;

/**
 * Un point de restauration du partage ENTIER. Contrairement à une version
 * (corbeille par fichier), il permet de revenir à « l'état du dossier tel qu'il
 * était mardi à 14 h ». Il ne copie aucun octet : c'est une photo de l'index,
 * les contenus étant déjà dédupliqués par hash dans le blob store.
 */
export const cloudSyncSnapshotSchema = z.object({
    id: z.number().int().positive(),
    kind: syncSnapshotKindSchema,
    label: z.string().max(SYNC_NAME_MAX).nullable(),
    fileCount: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative(),
    /** Secondes unix. */
    created: z.number().int().nonnegative()
});
export type CloudSyncSnapshot = z.infer<typeof cloudSyncSnapshotSchema>;

/** Ce que changerait une restauration, calculé avant de l'appliquer. */
export const cloudSyncSnapshotDiffSchema = z.object({
    /** Chemins que la restauration ferait revenir (contenu différent ou absent). */
    restored: z.number().int().nonnegative(),
    /** Chemins créés APRÈS le snapshot, que la restauration retirerait. */
    removed: z.number().int().nonnegative(),
    /** Chemins déjà identiques : rien à faire. */
    unchanged: z.number().int().nonnegative(),
    /**
     * Contenus dont le blob a disparu du stockage. Tant que ce n'est pas 0, la
     * restauration est REFUSÉE — mieux vaut ne rien faire qu'à moitié.
     */
    missingBlobs: z.number().int().nonnegative()
});
export type CloudSyncSnapshotDiff = z.infer<typeof cloudSyncSnapshotDiffSchema>;

export interface SyncSnapshotRow {
    id: number;
    share_id: number;
    kind: SyncSnapshotKind;
    label: string | null;
    file_count: number;
    total_bytes: number;
    created: number;
}

export interface SyncSnapshotFileRow {
    snapshot_id: number;
    rel_path: string;
    rel_path_hash: string;
    kind: SyncEntryKind;
    hash: string;
    size: number;
    mtime: number;
    mode: number | null;
}

/** Une version archivée (corbeille/backup), restaurable et téléchargeable. */
export const cloudSyncVersionSchema = z.object({
    id: z.number().int().positive(),
    relPath: z.string().max(SYNC_REL_PATH_MAX),
    hash: sha256HexSchema,
    size: z.number().int().nonnegative(),
    /** Millisecondes unix ; null quand inconnu. */
    mtime: z.number().int().nonnegative().nullable(),
    reason: syncVersionReasonSchema,
    /** Nom de l'appareil à l'origine du contenu ; null = serveur/inconnu. */
    sourceDeviceName: z.string().nullable(),
    /** Secondes unix. */
    created: z.number().int().nonnegative()
});
export type CloudSyncVersion = z.infer<typeof cloudSyncVersionSchema>;

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
    /**
     * Avancement DANS le fichier en cours. Sans ça, un fichier de plusieurs Go
     * laissait la barre parfaitement figée du début à la fin de son transfert :
     * les octets n'étaient comptés qu'une fois le fichier terminé.
     */
    currentBytes: z.number().int().nonnegative(),
    currentTotal: z.number().int().nonnegative(),
    direction: syncDirectionSchema.nullable(),
    error: z.string().max(500).nullable()
});
export type CloudSyncProgress = z.infer<typeof cloudSyncProgressSchema>;

/** Une entrée du journal d'un partage (erreurs de synchro, anomalies). */
export const cloudSyncEventSchema = z.object({
    id: z.number().int().positive(),
    /** Appareil concerné ; null pour un événement côté serveur. */
    deviceName: z.string().nullable(),
    /** Fichier/dossier concerné ; null pour un événement de session. */
    relPath: z.string().max(SYNC_REL_PATH_MAX).nullable(),
    message: z.string(),
    /** Secondes unix. */
    created: z.number().int().nonnegative()
});
export type CloudSyncEvent = z.infer<typeof cloudSyncEventSchema>;

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

export interface SyncShareRow {
    id: number;
    user_id: number;
    /** NULL = espace personnel (id 0 côté client). Toujours NULL en V1. */
    workspace_id: number;
    name: string;
    storage_path: string;
    status: SyncShareStatus;
    /** Rang d'affichage dans l'espace ; seul `cloudSync.reorderShares` le change. */
    sort_order: number;
    backup_prune_enabled: number;
    backup_limit_bytes: number | null;
    snapshot_enabled: number;
    snapshot_interval_hours: number;
    snapshot_keep_days: number;
    integrity_scan_enabled: number;
    rate_up_bps: number | null;
    rate_down_bps: number | null;
    trash_keep_days: number;
    conflict_policy: SyncConflictPolicy;
    created: number;
    updated: number;
}

export interface SyncEventRow {
    id: number;
    share_id: number;
    device_id: string | null;
    rel_path: string | null;
    message: string;
    created: number;
}

export interface SyncShareDeviceRow {
    id: number;
    share_id: number;
    device_id: string;
    local_path: string;
    status: SyncShareStatus;
    last_sync_at: number | null;
    created: number;
}

export interface SyncExclusionRow {
    id: number;
    share_id: number;
    kind: SyncExclusionKind;
    pattern: string;
    created: number;
}

/** Index canonique du partage (une ligne par chemin, y compris supprimés). */
export interface SyncFileRow {
    id: number;
    share_id: number;
    rel_path: string;
    /** SHA-256 du chemin relatif NFC-normalisé (support d'unicité MySQL). */
    rel_path_hash: string;
    /** `dir` uniquement pour les dossiers VIDES (voir {@link syncEntryKindSchema}). */
    kind: SyncEntryKind;
    hash: string;
    size: number;
    /** Millisecondes unix. */
    mtime: number;
    /** Permissions Unix (`& 0o777`) ; `null` quand aucun agent Unix ne l'a vu. */
    mode: number | null;
    source_device_id: string | null;
    state: SyncFileState;
    created: number;
    updated: number;
}

/**
 * Baseline par appareil : l'état qu'avait cet appareil à la fin de sa dernière
 * session. C'est la 3e voie du merge — sans ligne ici, une absence locale est
 * un « jamais eu », pas une suppression.
 */
export interface SyncDeviceFileRow {
    id: number;
    share_id: number;
    device_id: string;
    rel_path: string;
    rel_path_hash: string;
    kind: SyncEntryKind;
    hash: string;
    size: number;
    /** Millisecondes unix. */
    mtime: number;
    mode: number | null;
    synced_at: number;
}

export interface SyncVersionRow {
    id: number;
    share_id: number;
    rel_path: string;
    hash: string;
    size: number;
    /** Millisecondes unix ; NULL quand inconnu. */
    mtime: number | null;
    source_device_id: string | null;
    reason: SyncVersionReason;
    created: number;
}

export interface SyncSessionRow {
    id: number;
    share_id: number;
    device_id: string;
    state: SyncSessionState;
    files_total: number;
    bytes_total: number;
    files_done: number;
    bytes_done: number;
    error: string | null;
    started: number;
    finished: number | null;
}
