/**
 * Provider contracts: the inversion for code that needs a MODULE's data,
 * whether it is the app or another module.
 *
 * A module exposes named contracts on its service (`FeatureService.providers`);
 * the app looks them up at call time (`moduleProvider(key)` in its SDK
 * assembly, `ctx.providers.get(key)` from a module) and degrades cleanly when
 * the module is absent. The contract types live here, in the published
 * package, because both sides must agree on them while neither may import the
 * other. Every provider is offered by a module's service: the app offers none
 * itself.
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
 * included), and only the Databases feature knows how to decrypt a connection.
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
 * Key under `FeatureService.providers` for the Databases items the Projects
 * feature links to: same shape and reason as `UPTIME_ITEMS_PROVIDER`
 * (`project_database_links` is Projects' table).
 */
export const DATABASE_ITEMS_PROVIDER = 'database.items' as const;

export interface DatabaseItemsProvider {
    /** Is this database visible from this workspace: its home, or one it is projected into? */
    exists(databaseId: number, workspaceId: number): Promise<boolean>;
    /**
     * The item's display name as seen from `workspaceId` (its home, or a
     * workspace it is projected into): the provider resolves the home and its
     * OPEN cipher itself. `null` when it is gone or unreadable. What a window
     * onto a projected project shows for a link it cannot open: a name, never
     * an id.
     */
    labelOf(databaseId: number, workspaceId: number): Promise<string | null>;
}

/**
 * Key under `FeatureService.providers` for the workspace's outgoing mail: the
 * transport the app's notification channels of kind `email` send through.
 * Offered by the Mail module; absent, an email channel cannot be readied and
 * the settings screen says so. Senders are the module's OPEN-tier, enabled
 * accounts: a guarded mailbox needs a session unlock no background job has.
 */
export const MAIL_TRANSPORT_PROVIDER = 'mail.transport' as const;

/** A mailbox able to send without anyone unlocking anything. */
export interface MailSender {
    id: number;
    label: string;
    address: string;
}

/**
 * A file carried along a message: the `.ics` invitation of a booking, a small
 * report. `Uint8Array` rather than `Buffer`: the published package does not
 * depend on Node's types beyond `node:net`, and the adapter bridges it.
 */
export interface MailAttachment {
    filename: string;
    contentType: string;
    content: Uint8Array;
}

export interface MailTransportProvider {
    /** The workspace's ready senders (open tier, enabled). */
    listSenders(workspaceId: number): Promise<readonly MailSender[]>;
    /** Is this account a ready sender of this workspace right now? */
    isReady(accountId: number, workspaceId: number): Promise<boolean>;
    /**
     * Sends one message from this account. Resolves `true` when the provider
     * accepted it; `false` (never a throw) when the account is not a ready
     * sender or the send failed, the failure logged by the module.
     *
     * `text` stays mandatory whatever else is given: a recipient whose client
     * shows no HTML must lose nothing.
     */
    send(
        accountId: number,
        workspaceId: number,
        message: {
            to: string;
            subject: string;
            text: string;
            html?: string;
            attachments?: readonly MailAttachment[];
        }
    ): Promise<boolean>;
}

/**
 * Key under `FeatureClient.providers` for the Mail pieces the app's settings
 * shell composes: the ready senders an email channel picks from, and the
 * feature's own account dialog (the "+" of the channel form). The contract
 * types live in `@deveye/types/sdk/client`.
 */
export const MAIL_CLIENT_PROVIDER = 'mail.client' as const;

/**
 * Key under `FeatureService.providers` for the Audience sites the app's
 * Projects feature links to: same shape and same reason as
 * `UPTIME_ITEMS_PROVIDER` (`project_audience_links` is Projects' table).
 */
export const AUDIENCE_ITEMS_PROVIDER = 'audience.items' as const;

export interface AudienceItemsProvider {
    /** Is this site visible from this workspace: its home, or one it is projected into? */
    exists(siteId: number, workspaceId: number): Promise<boolean>;
    /**
     * The item's display name as seen from `workspaceId` (its home, or a
     * workspace it is projected into): the provider resolves the home and its
     * OPEN cipher itself. `null` when it is gone or unreadable. What a window
     * onto a projected project shows for a link it cannot open: a name, never
     * an id.
     */
    labelOf(siteId: number, workspaceId: number): Promise<string | null>;
}

/**
 * Key under `FeatureClient.providers` for the Audience pieces the app's
 * Projects screens compose: the list of the workspace's sites, a linked site
 * shown in full inside a project's tab, and the feature's own site dialog.
 * The contract types live in `@deveye/types/sdk/client`.
 */
export const AUDIENCE_CLIENT_PROVIDER = 'audience.client' as const;

/**
 * Key under `FeatureService.providers` for the Git repositories the app's
 * Projects feature links to: same shape and same reason as
 * `UPTIME_ITEMS_PROVIDER` (`project_repo_links` is Projects' table).
 */
export const GIT_ITEMS_PROVIDER = 'git.items' as const;

export interface GitItemsProvider {
    /** Is this repository visible from this workspace: its home, or one it is projected into? */
    exists(repoId: number, workspaceId: number): Promise<boolean>;
    /**
     * The item's display name as seen from `workspaceId` (its home, or a
     * workspace it is projected into): the provider resolves the home and its
     * OPEN cipher itself. `null` when it is gone or unreadable. What a window
     * onto a projected project shows for a link it cannot open: a name, never
     * an id.
     */
    labelOf(repoId: number, workspaceId: number): Promise<string | null>;
}

/**
 * Key under `FeatureClient.providers` for the Git pieces the app's Projects
 * screens compose: the list of the workspace's repositories, a linked
 * repository shown in full inside a project's tab, and the feature's own
 * repository dialog. The contract types live in `@deveye/types/sdk/client`.
 */
export const GIT_CLIENT_PROVIDER = 'git.client' as const;

/**
 * Key under `FeatureService.providers` for the Deploy targets the app's
 * Projects feature links to: same shape and same reason as
 * `UPTIME_ITEMS_PROVIDER` (`project_deploy_links` is Projects' table).
 */
export const DEPLOY_ITEMS_PROVIDER = 'deploy.items' as const;

export interface DeployItemsProvider {
    /** Is this target visible from this workspace: its home, or one it is projected into? */
    exists(targetId: number, workspaceId: number): Promise<boolean>;
    /**
     * The item's display name as seen from `workspaceId` (its home, or a
     * workspace it is projected into): the provider resolves the home and its
     * OPEN cipher itself. `null` when it is gone or unreadable. What a window
     * onto a projected project shows for a link it cannot open: a name, never
     * an id.
     */
    labelOf(targetId: number, workspaceId: number): Promise<string | null>;
}

/**
 * Key under `FeatureClient.providers` for the Deploy pieces the app's
 * Projects screens compose: the list of the workspace's targets, a linked
 * target shown in full inside a project's tab, and the feature's own target
 * dialog. The contract types live in `@deveye/types/sdk/client`.
 */
export const DEPLOY_CLIENT_PROVIDER = 'deploy.client' as const;

/**
 * Key under `FeatureClient.providers` for the Databases pieces the app's
 * Projects screens compose: the list of the workspace's databases, a linked
 * database shown in full inside a project's tab, and the feature's own
 * database dialog (declaring a database from a project goes through the real
 * form, never a reduced copy). The contract types live in
 * `@deveye/types/sdk/client` (they are React components).
 */
export const DATABASE_CLIENT_PROVIDER = 'database.client' as const;

/**
 * Key of what Projects knows about the items of OTHER features: the projects
 * of the workspace that link them (a module's list shows how many projects use
 * each item, its detail lists them by title), without reading Projects'
 * tables. Keyed by the linked feature's id so every linkable feature reads the
 * same contract.
 */
export const PROJECTS_USAGE_PROVIDER = 'projects.usage' as const;

/**
 * A project that links an item. Open tier only: a guarded project cannot link
 * a workspace item (its link row is plain, the item lives at the open tier),
 * so every title here is readable without a session.
 */
export interface ProjectUsage {
    projectId: number;
    title: string;
    status: 'draft' | 'active' | 'paused' | 'done';
}

export interface ProjectsUsageProvider {
    /** The workspace's projects linking this item of this feature, in Projects' display order. */
    usageOf(feature: string, itemId: number, workspaceId: number): Promise<readonly ProjectUsage[]>;
    /** How many projects of the workspace link each item of this feature (absent = zero). */
    countByItem(feature: string, workspaceId: number): Promise<ReadonlyMap<number, number>>;
    /**
     * The item is no longer visible from the workspace (deleted, moved away,
     * or its projection withdrawn): drop every link pointing at it from there,
     * and answer how many projects lost one. A link lives in the project's
     * workspace and points at an item visible there, so an item that leaves
     * takes none with it; left alone the rows would keep naming an item that
     * is not there any more.
     *
     * Called by the app, never by the module that owns the item. Idempotent,
     * and zero for a feature that links nothing.
     */
    detach(feature: string, itemId: number, workspaceId: number): Promise<number>;
    /**
     * Writes one line in a project's timeline (a deployment triggered from a
     * project's tab). Open tier only: an event aimed at a guarded project is
     * dropped silently. Rejects when the write fails; a lost timeline line
     * never turns a deployment into an error.
     */
    recordEvent(
        projectId: number,
        workspaceId: number,
        event: { kind: string; label: string; actorUserId: number | null }
    ): Promise<void>;
    /**
     * Reports a version on the projects linking this item that asked to
     * follow it (Projects' `versionSource`, `'github_release'` for a git
     * repository): the field then belongs to the item, and the project's
     * screen shows it read-only. All linked projects of the workspace, open
     * tier only; the others are left untouched.
     */
    applyVersion(
        feature: string,
        itemId: number,
        workspaceId: number,
        version: string
    ): Promise<void>;
}

/**
 * Key under `FeatureService.providers` for the Uptime items the app's Projects
 * feature links to. Projects stores only identifiers; before linking one it
 * asks the module whether the service exists in the workspace, so a foreign
 * id can neither be linked nor leak its existence.
 */
export const UPTIME_ITEMS_PROVIDER = 'uptime.items' as const;

export interface UptimeItemsProvider {
    /** Is this service visible from this workspace: its home, or one it is projected into? */
    exists(serviceId: number, workspaceId: number): Promise<boolean>;
    /**
     * The item's display name as seen from `workspaceId` (its home, or a
     * workspace it is projected into): the provider resolves the home and its
     * OPEN cipher itself. `null` when it is gone or unreadable. What a window
     * onto a projected project shows for a link it cannot open: a name, never
     * an id.
     */
    labelOf(serviceId: number, workspaceId: number): Promise<string | null>;
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
 * The client twin of the Devices module (`DevicesClientProvider`,
 * `sdk/client.ts`): the workspace's devices as a store, one device's panel
 * and tile. The app's home and topbar compose them; without the module they
 * render nothing device-related.
 */
export const DEVICES_CLIENT_PROVIDER = 'devices.client' as const;

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
