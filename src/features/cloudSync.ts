import { z } from 'zod';
import {
    cloudSyncEventSchema,
    cloudSyncExclusionSchema,
    cloudSyncFileSchema,
    cloudSyncProgressSchema,
    cloudSyncShareSchema,
    cloudSyncShareStateSchema,
    cloudSyncVersionSchema,
    SYNC_NAME_MAX,
    SYNC_PATTERN_MAX,
    SYNC_REL_PATH_MAX,
    SYNC_STORAGE_PATH_MAX,
    syncConflictPolicySchema,
    syncExclusionKindSchema,
    syncVersionSortSchema
} from '../domain/cloudSync';

const shareId = z.number().int().positive();
const deviceId = z.uuid();
/** Corrèle une demande de téléchargement à ses chunks poussés (`cloudSync.chunk`). */
const opId = z.string().min(1).max(64);
const relPath = z.string().min(1).max(SYNC_REL_PATH_MAX);
const storagePath = z.string().min(1).max(SYNC_STORAGE_PATH_MAX);

/** Liste les partages de l'utilisateur (stats, appareils, exclusions inclus). */
export const cloudSyncListShares = {
    command: 'cloudSync.listShares' as const,
    input: z.object({}),
    output: z.object({ shares: z.array(cloudSyncShareSchema) })
};

/**
 * Valide un chemin de stockage serveur avant création : absolu, inscriptible,
 * non imbriqué avec un autre partage. Renvoie l'espace disque libre.
 */
export const cloudSyncValidatePath = {
    command: 'cloudSync.validatePath' as const,
    input: z.object({ path: storagePath }),
    output: z.object({
        ok: z.boolean(),
        freeBytes: z.number().int().nonnegative().nullable(),
        /** Raison du refus (français), quand `!ok`. */
        problem: z.string().nullable()
    })
};

export const cloudSyncCreateShare = {
    command: 'cloudSync.createShare' as const,
    input: z.object({ name: z.string().min(1).max(SYNC_NAME_MAX), storagePath }),
    output: z.object({ share: cloudSyncShareSchema })
};

/** Met à jour un partage (le chemin de stockage est immuable en V1). */
export const cloudSyncUpdateShare = {
    command: 'cloudSync.updateShare' as const,
    input: z.object({
        shareId,
        name: z.string().min(1).max(SYNC_NAME_MAX).optional(),
        backupPruneEnabled: z.boolean().optional(),
        backupLimitBytes: z.number().int().positive().nullable().optional(),
        conflictPolicy: syncConflictPolicySchema.optional()
    }),
    output: z.object({ share: cloudSyncShareSchema })
};

/** Supprime un partage ; `deleteData` détruit aussi le blob store sur disque. */
export const cloudSyncDeleteShare = {
    command: 'cloudSync.deleteShare' as const,
    input: z.object({ shareId, deleteData: z.boolean() }),
    output: z.object({ ok: z.boolean() })
};

/** Attache un appareil au partage avec son dossier local de destination. */
export const cloudSyncAttachDevice = {
    command: 'cloudSync.attachDevice' as const,
    input: z.object({ shareId, deviceId, localPath: storagePath }),
    output: z.object({ ok: z.boolean() })
};

/** Détache un appareil (ses fichiers locaux restent intacts). */
export const cloudSyncDetachDevice = {
    command: 'cloudSync.detachDevice' as const,
    input: z.object({ shareId, deviceId }),
    output: z.object({ ok: z.boolean() })
};

export const cloudSyncPauseShare = {
    command: 'cloudSync.pauseShare' as const,
    input: z.object({ shareId }),
    output: z.object({ ok: z.boolean() })
};

export const cloudSyncResumeShare = {
    command: 'cloudSync.resumeShare' as const,
    input: z.object({ shareId }),
    output: z.object({ ok: z.boolean() })
};

export const cloudSyncPauseDevice = {
    command: 'cloudSync.pauseDevice' as const,
    input: z.object({ shareId, deviceId }),
    output: z.object({ ok: z.boolean() })
};

export const cloudSyncResumeDevice = {
    command: 'cloudSync.resumeDevice' as const,
    input: z.object({ shareId, deviceId }),
    output: z.object({ ok: z.boolean() })
};

/** Ajoute une exclusion (chemin exact, nom de composant, ou regex validée). */
export const cloudSyncAddExclusion = {
    command: 'cloudSync.addExclusion' as const,
    input: z.object({
        shareId,
        kind: syncExclusionKindSchema,
        pattern: z.string().min(1).max(SYNC_PATTERN_MAX)
    }),
    output: z.object({ exclusion: cloudSyncExclusionSchema })
};

export const cloudSyncRemoveExclusion = {
    command: 'cloudSync.removeExclusion' as const,
    input: z.object({ shareId, exclusionId: z.number().int().positive() }),
    output: z.object({ ok: z.boolean() })
};

/** Déclenche une session pour un appareil (ou tous les appareils actifs). */
export const cloudSyncSyncNow = {
    command: 'cloudSync.syncNow' as const,
    input: z.object({ shareId, deviceId: deviceId.optional() }),
    output: z.object({ started: z.number().int().nonnegative() })
};

/**
 * S'abonne aux événements live (`cloudSync.progress` / `cloudSync.state`) des
 * partages donnés et renvoie l'instantané courant pour amorcer l'UI.
 */
export const cloudSyncSubscribe = {
    command: 'cloudSync.subscribe' as const,
    input: z.object({ shareIds: z.array(shareId).max(50) }),
    output: z.object({
        progress: z.array(cloudSyncProgressSchema),
        states: z.array(cloudSyncShareStateSchema)
    })
};

export const cloudSyncUnsubscribe = {
    command: 'cloudSync.unsubscribe' as const,
    input: z.object({ shareIds: z.array(shareId).max(50) }),
    output: z.object({ ok: z.boolean() })
};

/** Navigue dans l'index canonique (depuis la BDD, jamais le FS). `dir` = '' à la racine. */
export const cloudSyncBrowse = {
    command: 'cloudSync.browse' as const,
    input: z.object({ shareId, dir: z.string().max(SYNC_REL_PATH_MAX) }),
    output: z.object({ dirs: z.array(z.string()), files: z.array(cloudSyncFileSchema) })
};

/** Le journal d'un partage : erreurs de synchro, datées, avec fichier et appareil. */
export const cloudSyncListEvents = {
    command: 'cloudSync.listEvents' as const,
    input: z.object({
        shareId,
        limit: z.number().int().positive().max(500),
        offset: z.number().int().nonnegative()
    }),
    output: z.object({
        events: z.array(cloudSyncEventSchema),
        total: z.number().int().nonnegative()
    })
};

/** Liste les versions archivées, paginées, avec les totaux pour la volumétrie. */
export const cloudSyncListVersions = {
    command: 'cloudSync.listVersions' as const,
    input: z.object({
        shareId,
        relPath: relPath.optional(),
        /** Ordre de tri (défaut : plus récentes d'abord). */
        sort: syncVersionSortSchema.optional(),
        limit: z.number().int().positive().max(500),
        offset: z.number().int().nonnegative()
    }),
    output: z.object({
        versions: z.array(cloudSyncVersionSchema),
        total: z.number().int().nonnegative(),
        totalBytes: z.number().int().nonnegative()
    })
};

/**
 * Restaure une version comme contenu courant de son chemin. Le contenu actuel
 * est archivé d'abord (reason `restore`) — l'invariant tient dans les deux sens.
 */
export const cloudSyncRestoreVersion = {
    command: 'cloudSync.restoreVersion' as const,
    input: z.object({ versionId: z.number().int().positive() }),
    output: z.object({ ok: z.boolean() })
};

export const cloudSyncDeleteVersion = {
    command: 'cloudSync.deleteVersion' as const,
    input: z.object({ versionId: z.number().int().positive() }),
    output: z.object({ ok: z.boolean() })
};

/** Supprime plusieurs sauvegardes d'un coup (sélection dans la corbeille). */
export const cloudSyncDeleteVersions = {
    command: 'cloudSync.deleteVersions' as const,
    input: z.object({ shareId, versionIds: z.array(z.number().int().positive()).min(1).max(500) }),
    output: z.object({ deleted: z.number().int().nonnegative() })
};

/** Vide toute la corbeille d'un partage (toutes les sauvegardes). */
export const cloudSyncClearVersions = {
    command: 'cloudSync.clearVersions' as const,
    input: z.object({ shareId }),
    output: z.object({ deleted: z.number().int().nonnegative() })
};

/** Télécharge une version : les octets arrivent en pushes `cloudSync.chunk` (base64). */
export const cloudSyncDownloadVersion = {
    command: 'cloudSync.downloadVersion' as const,
    input: z.object({ versionId: z.number().int().positive(), opId }),
    output: z.object({ ok: z.boolean(), size: z.number().int().nonnegative() })
};

/** Télécharge le contenu courant d'un chemin de l'index (même canal de chunks). */
export const cloudSyncDownloadFile = {
    command: 'cloudSync.downloadFile' as const,
    input: z.object({ shareId, relPath, opId }),
    output: z.object({ ok: z.boolean(), size: z.number().int().nonnegative() })
};

export const cloudSyncCommands = [
    cloudSyncListShares,
    cloudSyncValidatePath,
    cloudSyncCreateShare,
    cloudSyncUpdateShare,
    cloudSyncDeleteShare,
    cloudSyncAttachDevice,
    cloudSyncDetachDevice,
    cloudSyncPauseShare,
    cloudSyncResumeShare,
    cloudSyncPauseDevice,
    cloudSyncResumeDevice,
    cloudSyncAddExclusion,
    cloudSyncRemoveExclusion,
    cloudSyncSyncNow,
    cloudSyncSubscribe,
    cloudSyncUnsubscribe,
    cloudSyncBrowse,
    cloudSyncListEvents,
    cloudSyncListVersions,
    cloudSyncRestoreVersion,
    cloudSyncDeleteVersion,
    cloudSyncDeleteVersions,
    cloudSyncClearVersions,
    cloudSyncDownloadVersion,
    cloudSyncDownloadFile
] as const;
