/**
 * Provider contracts: the inversion for PUBLIC app code that needs a MODULE's
 * data.
 *
 * A module exposes named contracts on its service (`FeatureService.providers`);
 * the app looks them up at call time (`moduleProvider(key)` in its SDK
 * assembly) and degrades cleanly when the module is absent. The contract types
 * live here, in the published package, because both sides must agree on them
 * while neither may import the other.
 */

/** Key under `FeatureService.providers` for the CloudSync backup source. */
export const CLOUDSYNC_BACKUP_PROVIDER = 'cloudsync.backup' as const;

export interface SyncBackupShare {
    id: number;
    name: string;
    workspaceId: number;
    userId: number;
}

export interface SyncBackupStats {
    fileCount: number;
    liveBytes: number;
}

export interface SyncBackupFile {
    relPath: string;
    kind: 'file' | 'dir';
    hash: string;
    size: number;
    mtime: number;
    mode: number | null;
}

/**
 * What the Backup feature needs from CloudSync, inverted: the CloudSync module
 * registers this; Backup consumes it. Absent provider = the backup run fails
 * with a clean "module not installed" error and the UI hides the source kind.
 */
export interface CloudSyncBackupProvider {
    findShare(shareId: number): Promise<SyncBackupShare | null>;
    listShares(workspaceId: number): Promise<readonly SyncBackupShare[]>;
    statsByShare(shareId: number): Promise<SyncBackupStats>;
    listPresentFiles(shareId: number): Promise<readonly SyncBackupFile[]>;
    /** Decrypted plaintext stream of one blob. */
    openBlob(shareId: number, hash: string): Promise<AsyncIterable<Uint8Array>>;
}
