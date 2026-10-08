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

import type { SdkAccessVerdict } from './server';

/**
 * Keys under `FeatureService.providers` of the file trees the Backup feature
 * archives as a plain `tar`: a CloudSync share, a Hosting folder. Both offer a
 * `TreeBackupProvider`. Absent (module not installed), the source kind leaves
 * the picker and a job that names it fails its run with a clean message.
 */
export const CLOUDSYNC_BACKUP_PROVIDER = 'cloudsync.backup' as const;
export const HOSTING_BACKUP_PROVIDER = 'hosting.backup' as const;

/** One backupable tree of a workspace. */
export interface TreeBackupRoot {
    id: number;
    name: string;
    workspaceId: number;
    fileCount: number;
    bytes: number;
}

export interface TreeBackupEntry {
    /** Relative to the root, `/`-separated. */
    relPath: string;
    kind: 'file' | 'dir';
    /** The exact plaintext size: the tar header is written from it before the bytes. */
    size: number;
    /** Unix milliseconds. */
    mtime: number;
    mode: number | null;
    /** What `open` takes back for a file (a content hash, an entry id). */
    ref: string;
}

export interface TreeBackupProvider {
    /** The workspace's own trees (a projection is not a source), those the server can read. */
    list(workspaceId: number): Promise<readonly TreeBackupRoot[]>;
    /** `null` when unknown, unreadable, or not this workspace's own. */
    find(id: number, workspaceId: number): Promise<TreeBackupRoot | null>;
    entries(id: number): Promise<readonly TreeBackupEntry[]>;
    /** Decrypted plaintext stream of one file. */
    open(id: number, ref: string): Promise<AsyncIterable<Uint8Array>>;
    /**
     * May this member, without a session, read the tree's files? The same
     * right as downloading one from the feature's screens, the item's
     * override included.
     */
    authorize(id: number, workspaceId: number, userId: number): Promise<SdkAccessVerdict>;
}

/**
 * Key of the Mail server's mailboxes as a backup source: the messages, their
 * folders and flags, decrypted, for an archive a stock IMAP server reads.
 */
export const MAILSERVER_BACKUP_PROVIDER = 'mailserver.backup' as const;

export interface MailBackupMailbox {
    id: number;
    address: string;
    workspaceId: number;
    messageCount: number;
    bytes: number;
}

export interface MailBackupFolder {
    id: number;
    /** `/`-separated, UTF-8; `INBOX` is the inbox. */
    path: string;
    /** `\Sent`, `\Drafts`, `\Trash`, `\Junk`, `\Archive`, or `null`. */
    specialUse: string | null;
    subscribed: boolean;
    /** The IMAP keywords its messages carry, each once. */
    keywords: readonly string[];
}

export type MailBackupFlag = 'seen' | 'answered' | 'flagged' | 'deleted' | 'draft';

export interface MailBackupMessage {
    id: number;
    uid: number;
    /** The exact plaintext size of the RFC 822 message. */
    size: number;
    /** Unix seconds. */
    internalDate: number;
    flags: readonly MailBackupFlag[];
    keywords: readonly string[];
}

export interface MailServerBackupProvider {
    /** The workspace's own addresses (a projection is not a source). */
    listMailboxes(workspaceId: number): Promise<readonly MailBackupMailbox[]>;
    findMailbox(mailboxId: number, workspaceId: number): Promise<MailBackupMailbox | null>;
    /** Every folder, empty ones included: a restore must find them. */
    folders(mailboxId: number): Promise<readonly MailBackupFolder[]>;
    /** A page of a folder's messages, by ascending uid after `afterUid`. */
    messages(
        mailboxId: number,
        folderId: number,
        afterUid: number,
        limit: number
    ): Promise<readonly MailBackupMessage[]>;
    /**
     * Opens one message BEFORE resolving, so a message expunged since the
     * listing answers `null` here rather than failing mid-stream.
     */
    open(mailboxId: number, messageId: number): Promise<AsyncIterable<Uint8Array> | null>;
    /**
     * May this member, without a session, read the mail of this address? Who
     * can reset its password can; mere write access to the Mail server cannot.
     */
    authorize(mailboxId: number, workspaceId: number, userId: number): Promise<SdkAccessVerdict>;
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
    /**
     * May this member, without a session, read the database's data? The same
     * right as exploring it from the feature's screens, the item's override
     * included: a dump holds every row.
     */
    authorize(databaseId: number, workspaceId: number, userId: number): Promise<SdkAccessVerdict>;
}

/**
 * Key under `FeatureService.providers` for the Databases items the Projects
 * feature links to: same shape and reason as `UPTIME_ITEMS_PROVIDER`
 * (`project_database_links` is Projects' table).
 */
/**
 * Key of the read-only measurement the Projects module consumes for its custom
 * dashboard KPIs: the query goes through the SAME access as the monitoring (SSH
 * tunnel or SOCKS proxy included), and only the Databases feature knows how to
 * decrypt a connection.
 */
export const DATABASE_MEASURE_PROVIDER = 'database.measure' as const;

/** One measured number, or the reason there is none. */
export interface DatabaseNumberOutcome {
    value: number | null;
    error: string | null;
}

export interface DatabaseMeasureProvider {
    /**
     * Measures read-only queries against a database visible from this
     * workspace, in ONE session (tunnel included) whatever the number of
     * queries: opening one per query would cost far more than the figures are
     * worth.
     *
     * Each query must be a single read statement returning exactly one row and
     * one column; one that is refused or faulty yields its error and does not
     * interrupt the others, the way an alert's conditions behave. Answers
     * `null`, never throws, when the database is not visible from there.
     */
    measure(
        databaseId: number,
        workspaceId: number,
        queries: readonly string[]
    ): Promise<readonly DatabaseNumberOutcome[] | null>;
}

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
    send(accountId: number, workspaceId: number, message: MailTransportMessage): Promise<boolean>;
}

export interface MailTransportMessage {
    to: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: readonly MailAttachment[];
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
 * Key under `FeatureService.providers` for DevEye's own usage figures: the
 * app reports the pages its members open and the actions they take into an
 * Audience site of this very instance, chosen by an administrator, and
 * declares beside it a site for each of its public faces (status page,
 * showcase site), measured by the public beacon. Absent module: nothing is
 * reported, and the admin page says why.
 */
export const AUDIENCE_SELF_PROVIDER = 'audience.self' as const;

export interface AudienceSelfSite {
    siteId: number;
    workspaceId: number;
    name: string;
    active: boolean;
}

/** One measure, as the public beacon takes it: a page or an action, never who. */
export interface AudienceSelfEvent {
    type: 'view' | 'event';
    /** A static path (`/uptime/settings`), never an id or a name. */
    path: string;
    /** Required for an `event`. */
    name?: string;
    /** Milliseconds since the epoch; now when absent. */
    at?: number;
    referrer?: string;
    language?: string;
    timezone?: string;
    tzOffset?: number;
    screenWidth?: number;
}

/** A question of a feedback form the app declares: the public shape of the module's own field schema. */
export interface AudienceSelfFormField {
    name: string;
    kind: 'text' | 'email' | 'number' | 'boolean' | 'choice';
    required: boolean;
    /** `choice` only: the admitted answers. */
    choices?: readonly string[];
    /** `choice` only: several boxes may be ticked. */
    multiple?: boolean;
}

export interface AudienceSelfProvider {
    /**
     * Creates an anonymous site for this host in this workspace, active. The
     * caller owns the authorisation; the owner's plan still applies.
     *
     * `measuredBy`: `server` for the app itself, which reports through
     * `ingest` with no per-address cap (its members behind one network are
     * one address); `beacon` for a public page that embeds the tracking
     * script, where the per-address cap of a new site applies.
     */
    createSite(
        workspaceId: number,
        input: { name: string; host: string; description: string; measuredBy: 'server' | 'beacon' }
    ): Promise<AudienceSelfSite & { publicKey: string }>;
    /**
     * Declares a strict feedback form on a site created here, or returns the
     * one already bearing that name: a public page submits to it by name
     * through the public gate.
     */
    declareForm(
        workspaceId: number,
        siteId: number,
        input: { name: string; fields: readonly AudienceSelfFormField[] }
    ): Promise<{ formId: number }>;
    /** The site behind this key, wherever it lives; `null` when unknown. */
    findByKey(publicKey: string): Promise<AudienceSelfSite | null>;
    /**
     * Queued as if sent through the public beacon by that visitor, the Origin
     * check aside: the app vouches for them. The bot filter and the plan's
     * monthly limit still apply. Never throws.
     */
    ingest(req: {
        key: string;
        ip: string;
        userAgent: string;
        events: readonly AudienceSelfEvent[];
    }): void;
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
 * Key under `FeatureService.providers` for the Hosting folders the app's
 * Projects feature links to: same shape and same reason as
 * `UPTIME_ITEMS_PROVIDER` (`project_hosting_links` is Projects' table).
 * Hosting is a private module: absent, the tab never shows and nothing links.
 */
export const HOSTING_ITEMS_PROVIDER = 'hosting.items' as const;

export interface HostingItemsProvider {
    /** Is this folder visible from this workspace: its home, or one it is projected into? */
    exists(packId: number, workspaceId: number): Promise<boolean>;
    /**
     * The item's display name as seen from `workspaceId` (its home, or a
     * workspace it is projected into): the provider resolves the home and its
     * OPEN cipher itself. `null` when it is gone or unreadable.
     */
    labelOf(packId: number, workspaceId: number): Promise<string | null>;
}

/**
 * Key under `FeatureClient.providers` for the Hosting pieces the app's
 * Projects screens compose: the list of the workspace's folders, a linked
 * folder shown inside a project's tab, and the feature's own folder dialog.
 * The contract types live in `@deveye/types/sdk/client`.
 */
export const HOSTING_CLIENT_PROVIDER = 'hosting.client' as const;

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

/**
 * A project an item of another feature can be attached to, in ONE workspace.
 * Open tier and at home only: a guarded project links nothing, and a link is
 * posed in the project's own workspace, never through a projection of it.
 */
export interface ProjectLinkTarget {
    projectId: number;
    title: string;
    status: 'draft' | 'active' | 'paused' | 'done';
    /** Filed away: listed only while it still links the item, so the link can be undone. */
    archived: boolean;
    /** This project already links the item asked about. */
    linked: boolean;
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
     * The projects of ONE workspace an item of this feature can be attached to,
     * each saying whether it already links it. What the app's settings shell
     * lists on an item, workspace by workspace.
     *
     * Only projects living in that workspace at the open tier: a link is posed
     * at the project's home, and a guarded project links nothing. Filed-away
     * projects appear only while they still hold a link, so a dead link can be
     * undone without unfiling the project.
     *
     * Empty for a feature this provider links nothing of, so a caller never has
     * to know which features are linkable.
     */
    linkTargets(
        feature: string,
        itemId: number,
        workspaceId: number
    ): Promise<readonly ProjectLinkTarget[]>;
    /**
     * Attaches the item to one project of this workspace. Idempotent: the same
     * link declared twice is the same fact, not an error.
     *
     * The caller owns the authorisation (`projects: write` in that workspace)
     * and has checked the item is visible from there; this only refuses what
     * its own tables cannot hold, silently: an unknown or projected project,
     * and a guarded one.
     */
    link(feature: string, itemId: number, workspaceId: number, projectId: number): Promise<void>;
    /**
     * Drops that one link, and never touches the item itself. Idempotent.
     * Unlike {@link ProjectsUsageProvider.detach}, which drops every link of an
     * item that left the workspace, this answers one screen's single switch.
     */
    unlink(feature: string, itemId: number, workspaceId: number, projectId: number): Promise<void>;
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
 * Key under `FeatureService.providers` for the money Invoicing already knows:
 * the payments it recorded and the invoices still waiting for one. Offered by
 * the Invoicing module, read by Finances, which mirrors the payments into its
 * ledger instead of asking the user to type them twice. Absent module: the
 * ledger stays manual.
 */
export const INVOICING_LEDGER_PROVIDER = 'invoicing.ledger' as const;

/** One recorded payment. A payment is never edited, only removed: its fields are stable for its whole life. */
export interface InvoicingLedgerPayment {
    paymentId: number;
    docId: number;
    /** `YYYY-MM-DD`. */
    paidOn: string;
    amountCents: number;
    /** The payment's share of the invoice VAT, rounded like Invoicing's own dashboard. 0 under VAT exemption. */
    vatCents: number;
    method: 'transfer' | 'card' | 'cash' | 'check' | 'other';
    /** The invoice's currency, ISO 4217. */
    currency: string;
    docNumber: string;
    /** What `openFeature('invoicing', segment)` opens: the invoice's sheet. */
    segment: string;
}

/** An issued invoice still waiting for money. */
export interface InvoicingLedgerReceivable {
    docId: number;
    docNumber: string;
    /** From the client snapshot frozen at issue; empty when unreadable. */
    clientName: string;
    currency: string;
    /** `YYYY-MM-DD`. */
    issuedOn: string;
    /** `YYYY-MM-DD`, or null when the invoice states no due date. */
    dueOn: string | null;
    remainingCents: number;
    /** The VAT the remaining amount carries, pro rata of the invoice. 0 under VAT exemption. */
    remainingVatCents: number;
    overdue: boolean;
    segment: string;
}

export interface InvoicingLedgerProvider {
    /**
     * An opaque value that changes whenever a payment of the workspace appears
     * or disappears. One indexed query, no decryption: a consumer may call it
     * on every read and skip the rest while it holds still.
     */
    version(workspaceId: number): Promise<string>;
    /** Payments received on or after `from` (every payment when null), oldest first. No decryption. */
    payments(workspaceId: number, from: string | null): Promise<readonly InvoicingLedgerPayment[]>;
    /** Client names from the invoices' frozen snapshots, `''` when unreadable. Decrypts: ask only for what you store. */
    clientNames(
        workspaceId: number,
        docIds: readonly number[]
    ): Promise<ReadonlyMap<number, string>>;
    /** Issued invoices still waiting for money, earliest due first. */
    receivables(workspaceId: number): Promise<readonly InvoicingLedgerReceivable[]>;
    /** What Invoicing settles for the workspace; a consumer follows it rather than keeping a copy. */
    profile(workspaceId: number): Promise<{ currency: string; vatRegime: 'standard' | 'exempt' }>;
}

/**
 * Key under `FeatureClient.providers` for what Invoicing lets another screen
 * do in the user's name: record a payment the user recognised elsewhere (a
 * bank line in Finances). The contract type lives in `@deveye/types/sdk/client`.
 */
export const INVOICING_CLIENT_PROVIDER = 'invoicing.client' as const;

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

/**
 * The plan of an account: what bounds the quotas modules declare
 * (`manifest.quotas`). Offered by a billing module. WITHOUT it every quota is
 * unlimited, which is what a self-hosted DevEye is.
 *
 * The provider calls `live.accountChanged(userId)` after every change it
 * learns of by an event (a payment, a grant): that is when the host re-applies
 * the `stock` limits. A change that comes with time alone is announced by
 * `changesAt` instead.
 */
export const ACCOUNT_PLAN_PROVIDER = 'account.plan';

export interface AccountPlan {
    id: string;
    label: string;
    /** `<featureId>.<quotaKey>` to its maximum. An absent key is unlimited. */
    limits: Readonly<Record<string, number>>;
    /**
     * The account is served first when the host sheds load. While the admin
     * gives priority to such accounts, every limit of the others reads 0: their
     * stock is paused and their creations refused, until the mode ends.
     */
    priority: boolean;
    /** The plan is a trial ending then (ms since the epoch). */
    trialEndsAt?: number;
    /**
     * This answer changes by itself then, with no event to announce it (a
     * trial or a grant ending), in ms since the epoch: the host asks again.
     */
    changesAt?: number;
}

/**
 * Whether a plan is a paying one: the paid tier (trial included), an
 * administrator, a plan granted on the paid tier (`priority`), or no provider
 * at all (`null`, a self-hosted instance).
 */
export function isPaidPlan(plan: AccountPlan | null): boolean {
    return plan === null || plan.id === 'pro' || plan.id === 'admin' || plan.priority;
}

export interface AccountPlanProvider {
    /** `fresh`: never from a cache, the host is about to pause or resume on the answer. */
    planFor(userId: number, opts?: { fresh?: boolean }): Promise<AccountPlan>;
}
