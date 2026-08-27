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

/**
 * Key of the database access the Backup module consumes: a logical dump goes
 * through the SAME access as the monitoring (SSH tunnel or SOCKS proxy
 * included), and only the Databases feature knows how to decrypt a
 * connection. Offered by the app while Databases is native
 * (`registerNativeProvider`), by its module once migrated: Backup does not
 * know the difference.
 */
export const DATABASE_BACKUP_PROVIDER = 'database.backup' as const;

/** A database of the workspace, as the source picker lists it. */
export interface DatabaseBackupCandidate {
    id: number;
    name: string;
    engine: 'mysql' | 'postgres';
    host: string;
    database: string;
}

/**
 * An OPEN access to a database: what a dump tool needs, reachable from the
 * server (the tunnel's local listener when there is one). `close()` releases
 * the tunnel; call it whatever happens, a forgotten tunnel keeps an SSH
 * session and a listener alive.
 */
export interface DatabaseBackupAccess {
    engine: 'mysql' | 'postgres';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string | null;
    close(): Promise<void>;
}

export interface DatabaseBackupProvider {
    /** The databases of the workspace, its own only (a projection is not a source). */
    listDatabases(workspaceId: number): Promise<readonly DatabaseBackupCandidate[]>;
    findDatabase(databaseId: number, workspaceId: number): Promise<DatabaseBackupCandidate | null>;
    /** null when the database is unknown to this workspace. */
    openAccess(databaseId: number, workspaceId: number): Promise<DatabaseBackupAccess | null>;
}

/**
 * Key under `FeatureService.providers` for the Uptime items the app's Projects
 * feature links to. Projects stores only identifiers; before linking one it
 * asks the module whether the service exists in the workspace, so a foreign
 * id can neither be linked nor leak its existence.
 */
export const UPTIME_ITEMS_PROVIDER = 'uptime.items' as const;

export interface UptimeItemsProvider {
    /**
     * Does this service live in this workspace? Its home only, never a
     * projection: a project links what its workspace owns, the same rule the
     * native code applied before the module.
     */
    exists(serviceId: number, workspaceId: number): Promise<boolean>;
}

/**
 * Key under `FeatureClient.providers` for the Uptime pieces the app's Projects
 * screens compose: the availability strip and ratios of a linked service, and
 * the feature's own service dialog (declaring a service from a project goes
 * through the real form, never a reduced copy). The contract types live in
 * `@deveye/types/sdk/client` (they are React components).
 */
export const UPTIME_CLIENT_PROVIDER = 'uptime.client' as const;

/**
 * Key under `FeatureService.providers` for what Sentinel contributes to the
 * collection config the app pushes to an agent (`agent.config`): whether the
 * security probes run, and at which cadence. Absent module: the app pushes the
 * probes off.
 */
export const SENTINEL_AGENT_CONFIG_PROVIDER = 'sentinel.agentConfig' as const;

/**
 * Cadence du manifeste de persistance quand rien n'est réglé, en minutes.
 * Vit ici et non dans le domaine du module parce que l'app l'applique
 * elle-même : sans module installé, ou sans ligne de config pour l'appareil,
 * la config poussée à l'agent porte ce défaut (sondes éteintes).
 */
export const DEFAULT_SENTINEL_INTEGRITY_MINUTES = 360;

export interface SentinelAgentConfig {
    enabled: boolean;
    /** Cadence of the persistence manifest, in minutes. */
    integrityMinutes: number;
    /** Whether the agent reads the authentication journal. */
    authEvents: boolean;
}

export interface SentinelAgentConfigProvider {
    /** The device's contribution, or null when Sentinel knows nothing about it (probes off). */
    configFor(deviceId: string): Promise<SentinelAgentConfig | null>;
}
