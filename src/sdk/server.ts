import type { Duplex } from 'node:stream';
import type { FeatureAccountExport } from './accountExport';
import type { ItemTree, ItemTreeRows } from './copy';
import type { z, ZodType } from 'zod';
import type { ErrorCode } from '../protocol/error';
import type { FeatureAccess } from '../domain/workspaceRole';
import type { LogLevelName } from '../domain/logs';
import type { ItemAccess } from '../domain/sharing';
import type { AuthWindow, DeviceReport, IntegrityReport, ReportProcess } from '../domain/report';
import type { ContainerEngine, DockerAction, DockerInventory } from '../domain/deviceDocker';
import type { PathExclusion } from '../domain/pathExclusions';
import type { AgentManifest } from '../http/device';
import type { MetricSnapshot } from '../domain/metrics';
import type { UserColor } from '../domain/user';
import type { SdkDnsRecord } from './domains';
import type { MailTransportMessage } from './providers';
import type { ModuleEnvSpec } from './env';
import type { ExternalService } from '../domain/externalService';
import type {
    AgentSyncAckPayload,
    AgentSyncApplyChunkPayload,
    AgentSyncApplyDirPayload,
    AgentSyncApplyLocalPayload,
    AgentSyncApplyStartPayload,
    AgentSyncBusyPayload,
    AgentSyncChangedPayload,
    AgentSyncChunkPayload,
    AgentSyncConfigPayload,
    AgentSyncDeviceKeyPayload,
    AgentSyncDeletePayload,
    AgentSyncIndexPayload,
    AgentSyncMovePayload,
    AgentSyncOpResultPayload,
    AgentSyncPushPayload,
    AgentSyncPushAckPayload,
    AgentSyncScanPayload,
    AgentFilesMutatePayload,
    AgentFilesUploadPayload,
    CloudSyncChunkPush,
    CloudSyncProgressPush,
    CloudSyncStatePush
} from '../protocol/agent';

export {
    isPublicIp,
    isRemoteFailure,
    isSafePublicUrl,
    NetRefused,
    resolvesPublicly,
    safeFetchText,
    type SafeFetchOptions
} from './net';
export { mapLimit } from './pool';
export {
    authorizeRelayDevice,
    DEVICE_ACCESS_DENIALS,
    DEVICE_NETWORK_RIGHT,
    localForwarder,
    openDeviceTunnel,
    relayDeviceOptions,
    relayForAuthor,
    relayOf,
    type DeviceRelay,
    type LocalTunnel,
    type SavedDeviceChoice
} from './deviceRelay';
export {
    defineModuleEnv,
    MODULE_ENV_NAME_PATTERN,
    moduleEnvProblem,
    readModuleEnv,
    type ModuleEnvDefault,
    type ModuleEnvSpec,
    type ModuleEnvValues,
    type ModuleEnvVar
} from './env';
export {
    DOMAIN_HOST_PATTERN,
    domainOwnershipRecord,
    normaliseDomainHost,
    type SdkDnsRecord
} from './domains';

/**
 * Server-side SDK surface: what a feature module's handlers and background
 * service are given, and nothing else.
 *
 * This is a deliberate subset of the app's internal context. A module never
 * sees the full repo bundle, raw ciphers, or other features' data; it reaches
 * native features only through the declared {@link DevEyeFacade}.
 */

/**
 * Structural subset of the app logger (pino-compatible).
 *
 * `warn` and `error` are the operator's ladder: a bug, the instance's own
 * configuration, a dependency of the instance. A failure a user's own side
 * explains (their host unreachable, their credentials revoked, their agent
 * outdated, a quota of theirs reached) goes out as `info` with the field
 * `cause: 'user'`, see {@link logFailure}.
 */
export interface SdkLogger {
    debug(obj: unknown, msg?: string): void;
    info(obj: unknown, msg?: string): void;
    warn(obj: unknown, msg?: string): void;
    error(obj: unknown, msg?: string): void;
}

/**
 * Logs a failure at the level its cause calls for. `userSide`: the user's own
 * side explains it, and the line goes out as `info` tagged `cause: 'user'`, off
 * the operator's ladder yet still searchable, so a wave of them across accounts
 * still shows. Otherwise it stays at `level`. A failure nobody has explained is
 * the instance's: pass `false`.
 */
export function logFailure(
    logger: SdkLogger,
    userSide: boolean,
    fields: Record<string, unknown>,
    msg: string,
    level: 'warn' | 'error' = 'warn'
): void {
    if (userSide) logger.info({ ...fields, cause: 'user' }, msg);
    else logger[level](fields, msg);
}

/**
 * The typed error a handler throws to reply with a clean protocol error.
 * Anything else becomes an opaque `internal` error. Codes you will use:
 * `validation`, `forbidden`, `not_found`, `conflict`, `locked`, `internal`.
 */
export class FeatureError extends Error {
    constructor(
        public readonly code: ErrorCode,
        message: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = 'FeatureError';
    }
}

/** One update of {@link SdkFeatureContext.progress}: what is known, the rest left out. */
export interface CommandProgress {
    done?: number;
    total?: number;
    step?: string;
}

/**
 * A cipher over strings. `decrypt` throws a {@link FeatureError} (`locked`
 * when the guarded tier is sealed, `forbidden` for a foreign caller);
 * `tryDecrypt` returns `null` instead, for listings that degrade gracefully.
 */
export interface SdkCipher {
    encrypt(plaintext: string): Promise<string>;
    decrypt(blob: string): Promise<string>;
    tryDecrypt(blob: string): Promise<string | null>;
}

/**
 * How a stored value is protected. THE rule to remember:
 *
 *  - `'server'` (the default): encrypted at rest, the server can always read
 *    it. Right for API keys, tokens, cached data. Works in handlers AND in
 *    background services.
 *  - `'private'`: for user secrets the server operator must not be able to
 *    read when password encryption is on. Handlers only. Reads can throw
 *    `locked` or `forbidden`; your UI must tolerate both. NEVER available in
 *    background services: if a scheduler needs the value, store a `'server'`
 *    projection instead.
 *  - `'none'`: plaintext, for non-sensitive metadata you want to query in SQL.
 */
export type StorageEncryption = 'server' | 'private' | 'none';

/**
 * Per-feature, per-workspace key-value storage. The simplest way to persist:
 * no table, no migration, encryption in one argument. For relational data,
 * declare your own tables and a repo instead (see {@link FeatureServer}).
 */
export interface FeatureStore {
    put(key: string, value: string, opts?: { encryption?: StorageEncryption }): Promise<void>;
    putJson<T>(
        key: string,
        schema: ZodType<T>,
        value: T,
        opts?: { encryption?: StorageEncryption }
    ): Promise<void>;
    /** Decrypts according to how the row was written. */
    get(key: string): Promise<string | null>;
    getJson<T>(key: string, schema: ZodType<T>): Promise<T | null>;
    remove(key: string): Promise<void>;
    keys(prefix?: string): Promise<string[]>;
}

/**
 * The background-service variant: `'private'` is unrepresentable here, and
 * `get()` on a `'private'` row throws `locked`. This is by design, not a
 * missing feature: the private tier only exists inside an unlocked user
 * session, which a scheduler never has.
 */
export interface SessionlessFeatureStore {
    put(key: string, value: string, opts?: { encryption?: 'server' | 'none' }): Promise<void>;
    putJson<T>(
        key: string,
        schema: ZodType<T>,
        value: T,
        opts?: { encryption?: 'server' | 'none' }
    ): Promise<void>;
    get(key: string): Promise<string | null>;
    getJson<T>(key: string, schema: ZodType<T>): Promise<T | null>;
    remove(key: string): Promise<void>;
    keys(prefix?: string): Promise<string[]>;
}

/**
 * Access to your feature's own tables. Deliberately thin and workspace-unaware:
 * your repo filters by `workspace_id` itself, with `?` placeholders, exactly
 * like every native repo. Table names must carry your `ft_<slug>_` prefix
 * (checked at build time). Repos never encrypt: handlers pass values already
 * sealed through `ctx.cipher(...)`.
 */
export interface SdkQueryable {
    query<T extends object>(sql: string, params?: unknown[]): Promise<T[]>;
    execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number; insertId: number }>;
}

/**
 * An alert as the notify facade delivers it. `subject` and `body` are what every
 * channel receives (mail, Slack, a custom webhook); `payload` adds structured
 * fields for a custom endpoint; `embeds` is the optional Discord layout, used
 * only on a Discord channel, where it replaces the plain text (see the app's
 * `Services/notifications.ts`). Keep the text complete on its own: a channel
 * that knows no embeds must lose nothing.
 */
export interface SdkAlert {
    subject: string;
    body: string;
    payload?: Record<string, unknown>;
    /** Discord embed objects, as the Discord webhook API takes them. */
    embeds?: readonly Record<string, unknown>[];
}

/** A routed channel that can carry a live message (see `notify.liveChannels`). */
export interface SdkLiveChannel {
    id: number;
}

/** A rich message for a live channel: what the Discord webhook API takes. */
export interface SdkRichMessage {
    content?: string;
    embeds?: readonly Record<string, unknown>[];
}

/**
 * One process-list instant next to its metric row: what a security engine
 * needs to judge a device at a given timestamp. Capability `'telemetry.read'`.
 */
export interface SdkTelemetrySnapshot {
    ts: number;
    processes: ReportProcess[];
    activeConnections: number | null;
}

/**
 * Read access to the devices' telemetry (capability `'telemetry.read'`,
 * reserved to native-id modules: the metric store is app infrastructure).
 */
export interface SdkTelemetry {
    /** The instant nearest `ts` (process list plus the metric row), or null when nothing was recorded around it. */
    snapshot(deviceId: string, ts: number): Promise<SdkTelemetrySnapshot | null>;
    /** Pins the instant at `ts` so retention never prunes the evidence a finding rests on. */
    pinInstant(deviceId: string, ts: number): Promise<void>;
}

/**
 * Native features, reachable only if declared in `manifest.nativeCapabilities`.
 * An undeclared call throws `forbidden`.
 */
export interface DevEyeFacade {
    /** Requires capability `'notify'`. Uses the channels/routes the workspace configured for YOUR feature. */
    notify: {
        /** Is at least one usable channel routed to this target? */
        hasRoute(itemId?: number): Promise<boolean>;
        /**
         * Delivers to the configured channels. Resolves `true` if at least one
         * accepted. `except`: channel ids to skip, those a live message
         * (`postLive`) already concluded on, so a channel never hears the
         * same news twice. `itemIds`: the channels routed to ANY of these
         * items, each channel once: for news that concerns several items at
         * a time (the instance they share went down), told once.
         */
        send(
            alert: SdkAlert,
            opts?: { itemId?: number; itemIds?: readonly number[]; except?: readonly number[] }
        ): Promise<boolean>;
        /**
         * The routed channels able to carry a LIVE message: a rich message
         * posted once and edited until it concludes (Discord webhooks today).
         * Empty when none is routed to this target. Same routing as `send`.
         */
        liveChannels(opts?: { itemId?: number }): Promise<readonly SdkLiveChannel[]>;
        /**
         * Posts a rich message on one live channel of YOUR feature, or edits
         * it when `messageId` is given. Resolves the message id to keep for
         * the next edit, `null` when the channel refused (a message deleted
         * by hand, a revoked webhook): stop there, never repost.
         */
        postLive(
            channelId: number,
            message: SdkRichMessage,
            messageId?: string | null
        ): Promise<string | null>;
    };
    /** Requires capability `'mail.accounts'`. Open-tier accounts, metadata only, never credentials. */
    mail: {
        listAccounts(): Promise<
            ReadonlyArray<{ id: number; label: string; address: string | null }>
        >;
    };
    /**
     * Requires capability `'workspaces.read'` AND a global administrator as
     * caller (`forbidden` otherwise): every workspace of this DevEye.
     */
    workspaces: {
        list(): Promise<readonly SdkWorkspaceSummary[]>;
    };
    /** Requires capability `'members.read'`. */
    members: {
        /**
         * The workspace's members, owner included. `color` is the account's
         * colour, the one its live presence wears everywhere; null for an
         * account never coloured (fall back to `defaultUserColor(userId)`,
         * exactly like the app does).
         */
        list(): Promise<
            ReadonlyArray<{
                userId: number;
                name: string;
                isOwner: boolean;
                color: UserColor | null;
            }>
        >;
    };
    /** Requires capability `'devices.read'`. */
    devices: {
        /**
         * Throws `not_found` unless the device exists AND is visible in this
         * workspace (its own, or shared into it), a global administrator
         * included: membership is the boundary. With `extras`, a handler also requires the CALLER to hold these
         * permissions of the Devices feature on this device (`docker` to drive
         * its containers), and throws `forbidden` otherwise: a module cannot
         * name another feature's permissions in its own `access`.
         */
        authorize(deviceId: string, options?: { extras?: readonly string[] }): Promise<SdkDevice>;
        /** The devices this workspace sees: its own, and those shared into it. */
        list(): Promise<readonly SdkDevice[]>;
        isOnline(deviceId: string): boolean;
    };
    /** Requires capability `'telemetry.read'` (native-id modules only). */
    telemetry: SdkTelemetry;
    /** Requires capability `'agents'`. Same object as the service deps' `agents`. */
    agents: AgentsFacade;
    /** Requires capability `'accounts.read'`. */
    accounts: {
        /** The CALLER's own account, never someone else's. */
        me(): Promise<SdkAccount>;
    };
    /** Requires capability `'accounts.usage'`. */
    usage: {
        /**
         * What this account uses of every limit this DevEye knows. The caller
         * must be this account or a global administrator (`forbidden`
         * otherwise); an unknown account throws `not_found`.
         */
        of(userId: number): Promise<SdkAccountUsage>;
        /**
         * `of` for many accounts, in the order given, unknown ids left out. A
         * global administrator's surface only. The host paces the counting so a
         * sweep never starves the database: one call, never one per account.
         */
        ofMany(userIds: readonly number[]): Promise<readonly SdkAccountUsage[]>;
    };
}

/** An account of this DevEye, as `'accounts.read'` shows it. */
export interface SdkAccount {
    id: number;
    email: string;
    username: string;
    /** A global administrator of this DevEye. */
    isAdmin: boolean;
    /**
     * A throwaway account the app's end-to-end runner created and will delete:
     * never a person, and its address receives nothing. Check this, never the
     * address: it is set once, at creation, and nothing can grant it later.
     */
    e2e: boolean;
    /** Suspended by an administrator: it keeps everything and cannot sign in. */
    suspended: boolean;
    /** Milliseconds since the epoch. */
    created: number;
}

/** Any account, sessionless (capability `'accounts.read'`), for services. */
export interface SdkAccounts {
    find(userId: number): Promise<SdkAccount | null>;
    findByEmail(email: string): Promise<SdkAccount | null>;
    list(userIds: readonly number[]): Promise<readonly SdkAccount[]>;
    /**
     * Accounts whose username or email contains `query`, case-insensitively,
     * by username. An all-digit query also matches that account id, listed
     * first. An empty query returns the first accounts. `limit` defaults to 20
     * and is capped at 50.
     */
    search(query: string, limit?: number): Promise<readonly SdkAccount[]>;
    /** Every account, oldest first: an administrator's sweep. What you show of it is yours to gate. */
    all(): Promise<readonly SdkAccount[]>;
}

/** What one account uses of one limit, whatever its plan allows. */
export interface SdkAccountQuotaUse {
    /**
     * `stock`: things that exist, the excess paused; `flow`: checked at each
     * use, nothing paused; `perOperation`: one operation bounded, nothing counted.
     */
    kind: 'stock' | 'flow' | 'perOperation';
    /**
     * What the limit is compared to now, over every workspace the account
     * OWNS: the things that exist, paused ones included, for a `stock`; this
     * month's flow or the bytes held otherwise; for `workspace.members`, its
     * fullest shared workspace. `null` for a `perOperation` limit.
     */
    used: number | null;
    /** How many of them its plan holds paused, in the unit of `used`. 0 for anything but a stock. */
    paused: number;
}

/** What one account uses, as `'accounts.usage'` reads it. */
export interface SdkAccountUsage {
    userId: number;
    /**
     * By `<featureId>.<quotaKey>`: every quota of the installed modules and the
     * host's own (`workspace.shared`, `workspace.members`, `domains.hosts`),
     * bounded or not. The limits are the plan provider's (`planFor`).
     */
    quotas: Readonly<Record<string, SdkAccountQuotaUse>>;
}

/**
 * Any account's usage, sessionless (capability `'accounts.usage'`), for
 * services: the same reading as `ctx.deveye.usage`, without its caller check.
 */
export interface SdkUsage {
    of(userId: number): Promise<SdkAccountUsage>;
    ofMany(userIds: readonly number[]): Promise<readonly SdkAccountUsage[]>;
}

/** One email to an account. Plain text everywhere: the host lays it out and escapes it. */
export interface SdkAccountMailMessage {
    subject: string;
    /** One paragraph each, in order. */
    paragraphs: readonly string[];
    /** Framed and set apart after the paragraphs: what the reader must not miss (a deadline). */
    notice?: string;
    /** A link drawn as a button, after the notice. */
    button?: { label: string; url: string };
    /** Small print, last. */
    footnote?: string;
}

/** Emails to the accounts of this DevEye, from the server's own sender (capability `'accounts.mail'`). */
export interface SdkAccountMail {
    /** `false` when this server has no mail transport: `send` would throw `conflict`. */
    readonly configured: boolean;
    /**
     * Sends to the account's own address, never another, and resolves that
     * address for your records. Throws `not_found` for an unknown account and
     * `conflict` without a transport; a refusal of the mail server rejects as
     * is. Nothing is retried for you.
     */
    send(userId: number, message: SdkAccountMailMessage): Promise<string>;
    /**
     * One copy to each active administrator of this DevEye, for what only the
     * operator can act on (a report of illicit content). Resolves the addresses
     * reached, empty when there is no active administrator. Every address is
     * tried; the first refusal then rejects. Throws `conflict` without a transport.
     */
    sendToAdmins(message: SdkAccountMailMessage): Promise<readonly string[]>;
}

/**
 * The items of YOUR `stock` quotas that their owner's plan holds paused: the
 * most recently created beyond the limit. Nothing of theirs is deleted; they
 * resume on their own once the limit rises or a slot frees. A paused item
 * stays readable, editable and deletable, and NOTHING of it runs: not on
 * schedule, not on demand. Both reads are synchronous (an in-memory mirror),
 * fit for a hot path. A key that is not a declared stock throws `validation`.
 */
export interface SdkPlanPauses {
    isPaused(key: string, itemId: string): boolean;
    /**
     * Every paused id of the key, whatever the account: exclude them IN THE
     * SQL of a due list (`id NOT IN (...)`, guard the empty list). Filtering
     * after its `LIMIT` would let the paused, whose timestamps never advance,
     * fill the window and starve the rest.
     */
    paused(key: string): readonly string[];
}

/** Where the owner stands against one limit of YOUR `manifest.quotas`. */
export interface SdkQuotaUse {
    /** By YOUR `server.quotas[key]`, over every workspace the owner owns. */
    used: number;
    limit: number;
}

/**
 * What the account's plan allows of YOUR `manifest.quotas`. The account is the
 * OWNER of the workspace of the call: in a shared workspace, what a member
 * creates counts against its owner. Without a plan provider installed,
 * everything is unlimited.
 */
export interface SdkQuota extends SdkPlanPauses {
    /**
     * `null` = unlimited. An undeclared key throws `validation`. Reads 0 while
     * the host serves priority accounts first and the owner is not one.
     */
    limit(key: string): Promise<number | null>;
    /**
     * Call it BEFORE creating. `countAfter` receives the ids of every workspace
     * the owner account owns and returns how many there would be once created;
     * it is never called when unlimited. Throws `quota_exceeded` beyond the
     * limit. Count with the same repo function as `server.quotas[key]`: the
     * usage shown and the refusal must agree.
     */
    assert(
        key: string,
        countAfter: (ownerWorkspaceIds: readonly number[]) => Promise<number>
    ): Promise<void>;
    /**
     * Where the owner stands, counted by YOUR `server.quotas[key]`: what a
     * screen says BEFORE the refusal. `null` = unlimited, and nothing is
     * counted. A `perOperation` key throws `validation`: nothing accumulates.
     */
    usage(key: string): Promise<SdkQuotaUse | null>;
    /**
     * Call it before running a `stock` item on demand (check now, deploy now,
     * open a session): throws `quota_exceeded` when its owner's plan holds it
     * paused, which opens the plan prompt on the client.
     */
    assertActive(key: string, itemId: string): Promise<void>;
    /**
     * Whether the owner pays: a paid or trial plan, a plan granted on the paid
     * tier, an administrator, or no plan provider at all (a self-hosted
     * instance). What a default that costs the host keys on (a probe cadence),
     * never a refusal: refusals go through `limit` and `assert`.
     */
    paid(): Promise<boolean>;
}

/** One item a `stock` quota counts. */
export interface SdkStockItem {
    /**
     * Your item's id when the quota counts your items: a move then checks the
     * target owner's plan for it. Anything else the quota counts (a page an
     * item publishes, which stays behind on a move) takes an id of its own.
     */
    id: string;
    workspaceId: number;
}

/** What one reconciliation changed for one of your `stock` quotas. */
export interface SdkPlanPauseChange {
    key: string;
    paused: readonly SdkStockItem[];
    resumed: readonly SdkStockItem[];
}

/**
 * How the host counts one of your quotas, for `ctx.quota.usage` and an
 * account's usage (`'accounts.usage'`): a `stock` by its list, any other by
 * its count, under the very WHERE of the counter you pass to `assert`.
 */
export interface FeatureQuotaEntry<Repo = unknown> {
    /**
     * `stock` quotas only, required there: the items the quota counts in these
     * workspaces, OLDEST FIRST (creation, then id). How many is the usage; the
     * host keeps the first `limit` running and pauses the rest.
     */
    list?(repo: Repo, ownerWorkspaceIds: readonly number[]): Promise<readonly SdkStockItem[]>;
    /**
     * Any other quota but `perOperation`, required there: what the limit is
     * compared to now (this month's events, the bytes held). A month is the
     * current UTC month unless your feature keeps a calendar of its own.
     */
    count?(repo: Repo, ownerWorkspaceIds: readonly number[]): Promise<number>;
}

/** A workspace as the fleet sees it: enough to attach a device to it. */
export interface SdkWorkspaceSummary {
    id: number;
    name: string;
    kind: 'personal' | 'shared';
    ownerUserId: number;
}

/**
 * The agent-fleet sync transport (capability `'agents'`, native-id modules
 * only). Method names mirror the app's MonitorHub. Outbound calls return
 * `false` when the agent is offline (frame dropped, never queued).
 */
export interface AgentsFacade {
    isOnline(deviceId: string): boolean;
    /**
     * The two orders a device's lifecycle gives the hub. `requestDestroy`
     * asks the agent to uninstall itself (deletion path); `disconnectAgent`
     * closes its socket now (a revoked or force-deleted device). Both answer
     * `false` when the agent is not connected, which is not an error.
     */
    requestDestroy(deviceId: string): boolean;
    disconnectAgent(deviceId: string): boolean;
    /**
     * The manifest of the agent binaries the app serves (the build version and,
     * per target, whether the binary is signed), or null while nothing is
     * synced. What a fleet screen needs to flag an agent able to self-update
     * (`agent.update`); the binaries and their distribution stay the app's.
     */
    servedManifest(): Promise<AgentManifest | null>;
    /**
     * Asks the agent for an immediate security scan (persistence manifest and
     * authentication window). Distinct from the metric refresh on purpose: a
     * scan fingerprints hundreds of files.
     */
    requestScan(deviceId: string): boolean;
    /**
     * Pushes the device's collection config to its agent, recomposed by the
     * app from the device row and the installed modules' contributions (see
     * `SENTINEL_AGENT_CONFIG_PROVIDER`). Call it after changing what your
     * module contributes to that config. Resolves `false` when the agent is
     * offline (it receives the config at its next connection anyway).
     */
    pushConfig(deviceId: string): Promise<boolean>;
    /**
     * The cadence each device's agent runs at, by device id: its own setting,
     * or the default of the plan of its HOME workspace's owner.
     */
    metricIntervals(
        devices: readonly {
            id: string;
            workspace_id: number | null;
            metric_interval_seconds: number | null;
        }[]
    ): Promise<ReadonlyMap<string, number>>;
    requestSyncConfig(deviceId: string, payload: AgentSyncConfigPayload): boolean;
    requestSyncScan(deviceId: string, payload: AgentSyncScanPayload): boolean;
    requestSyncPush(deviceId: string, payload: AgentSyncPushPayload): boolean;
    requestSyncPushAck(deviceId: string, payload: AgentSyncPushAckPayload): boolean;
    requestSyncApplyChunk(deviceId: string, payload: AgentSyncApplyChunkPayload): boolean;
    requestSyncApplyStart(deviceId: string, payload: AgentSyncApplyStartPayload): boolean;
    requestSyncApplyDir(deviceId: string, payload: AgentSyncApplyDirPayload): boolean;
    requestSyncApplyLocal(deviceId: string, payload: AgentSyncApplyLocalPayload): boolean;
    requestSyncMove(deviceId: string, payload: AgentSyncMovePayload): boolean;
    requestSyncDelete(deviceId: string, payload: AgentSyncDeletePayload): boolean;
    /** Fan-out to the browsers subscribed to the payload's share. */
    publishSyncProgress(payload: CloudSyncProgressPush): void;
    publishSyncState(payload: CloudSyncStatePush): void;
    /**
     * File orders on a device, the ones the file explorer already speaks
     * (`files.mutate`: mkdir, rename, delete; `files.upload`: a chunk at an
     * offset, `done` on the last one). What makes an enrolled machine a
     * backup target without changing the agent. The agent answers ONE
     * `files.op` frame per `opId`: arm `awaitFilesOp` before sending, and
     * for an upload before the FIRST chunk (the answer comes with the last
     * one, or with the first write failure).
     */
    requestFilesMutate(deviceId: string, payload: AgentFilesMutatePayload): boolean;
    requestFilesUpload(deviceId: string, payload: AgentFilesUploadPayload): boolean;
    awaitFilesOp(opId: string, timeoutMs: number): Promise<{ ok: boolean; error?: string }>;
    /** Forgets a pending `awaitFilesOp` (the frame was never sent, or the caller gave up). */
    cancelFilesOp(opId: string): void;
    /**
     * A Docker action on a device, for a caller without a socket (a
     * deployment). Takes the device's long-action lock, which the Devices
     * screens share: refused at once while another long action runs there.
     * Streams the action's output lines to `onLine` and resolves with its
     * verdict, a refusal by the machine's local policy included. Never throws.
     */
    dockerRun(
        deviceId: string,
        order: { engine: ContainerEngine; action: DockerAction; target: string | null },
        options?: { onLine?: (line: string) => void; timeoutMs?: number }
    ): Promise<{ ok: boolean; error?: string }>;
    /** The device's containers, images and volumes; `null` when its agent does not answer in time. */
    dockerInventory(deviceId: string, timeoutMs?: number): Promise<DockerInventory | null>;
    /**
     * The `.tar.gz` of one of the device's folders, built by its agent and
     * pulled at the consumer's pace: the agent sends no more than the
     * consumer has taken, so a slow destination slows the machine down
     * instead of filling the server's memory. Leaving the loop, throwing in
     * it or aborting `signal` cancels the archive on the machine. The stream
     * throws when the device is or goes offline, and when its agent does not
     * answer (one that predates the order): check `report.agent.probes` for
     * `AGENT_FOLDER_ARCHIVE_PROBE` first to say so plainly.
     */
    archiveFolder(
        deviceId: string,
        request: AgentFolderArchiveRequest,
        options?: { signal?: AbortSignal }
    ): AgentFolderArchive;
    /**
     * A TCP connection opened BY THE DEVICE to `host:port` and relayed by its
     * agent: a service only the machine can reach (a database on its
     * loopback) becomes a stream here, read at the consumer's pace. The agent
     * only reaches its own loopback, plus the hosts its operator lists in
     * `tunnel_targets`, and refuses everything under `allow_tunnel = false`.
     * Rejects with the reason (offline, refused, unreachable, an agent that
     * predates the order: check `report.agent.probes` for
     * `AGENT_TUNNEL_PROBE` first to say so plainly). Once open, the stream is
     * destroyed with an error when the device goes offline; ending or
     * destroying it closes the connection on the machine.
     */
    openTcp(deviceId: string, target: { host: string; port: number }): Promise<Duplex>;
    /**
     * Bytes queued on the agent's socket, not yet on the wire. A sender that
     * streams towards an agent must watch it: the socket accepts everything,
     * and without backpressure the server's memory follows the size of what
     * is sent.
     */
    buffered(deviceId: string): number;
}

/** What a folder archive covers. */
export interface AgentFolderArchiveRequest {
    /** Absolute path on the machine. */
    path: string;
    exclusions: readonly PathExclusion[];
    /** Do not descend into another filesystem (a network mount, a removable disk). */
    oneFileSystem: boolean;
}

/** How a folder archive went, once its stream has ended. */
export interface AgentFolderArchiveSummary {
    files: number;
    dirs: number;
    bytesRead: number;
    /** Entries left out because they could not be read. */
    skipped: number;
    /** Files whose size changed while they were read: archived padded or cut. */
    changed: number;
    /** The first skipped or changed entries, and why. */
    samples: ReadonlyArray<{ path: string; reason: string }>;
}

/** The pieces of a folder archive, in order; `summary` is filled once they have all come. */
export interface AgentFolderArchive extends AsyncIterable<Buffer> {
    readonly summary: AgentFolderArchiveSummary | null;
}

/** Why a member does not hold a permission (see `FeatureServiceDeps.access`). */
export type SdkAccessDenial =
    'not_member' | 'suspended' | 'level' | 'not_granted' | 'hidden' | 'read_only' | 'no_device';

export type SdkAccessVerdict = { ok: true } | { ok: false; reason: SdkAccessDenial };

/**
 * The caller's own browser socket (capability `'agents'`): live subscriptions
 * and chunked downloads with backpressure. Mirrors the app's MonitorTransport
 * sync subset.
 */
export interface SdkSocketTransport {
    subscribeSync(shareIds: number[]): void;
    unsubscribeSync(shareIds: number[]): void;
    /** Returns the socket's send-buffer size after the frame, for backpressure. */
    sendSyncChunk(payload: CloudSyncChunkPush): number;
    syncChunkBuffered(): number;
}

/**
 * Inbound agent events, dispatched to the modules that declare `'agents'`.
 * Every hook is optional. Hooks may fire before your service's `start()` has
 * completed: drop quietly, the agent will resend or reconcile. Telemetry hooks
 * fire once the app has persisted it, and only for ACTIVE devices; whether the
 * device is watched by YOUR feature is your decision.
 */
export interface FeatureAgentHooks {
    onAgentConnect?(deviceId: string): void | Promise<void>;
    onAgentOffline?(deviceId: string): void;
    /** The OS/security report (`agent.report`), just written to the device row. */
    onReport?(deviceId: string, report: DeviceReport): void | Promise<void>;
    /** A batch of metric instants, oldest first, just written to the metric store. */
    onMetricsBatch?(deviceId: string, snapshots: readonly MetricSnapshot[]): void | Promise<void>;
    /** The persistence manifest (`agent.integrity`). Never stored by the app: it only exists here. */
    onIntegrity?(deviceId: string, integrity: IntegrityReport): void | Promise<void>;
    /** An authentication window (`agent.authEvents`). Never stored by the app either. */
    onAuthEvents?(deviceId: string, auth: AuthWindow): void | Promise<void>;
    /** `deviceId` est l'identite AUTHENTIFIEE du socket ; le payload en porte une copie non fiable. */
    onSyncChanged?(deviceId: string, payload: AgentSyncChangedPayload): void;
    onSyncIndex?(deviceId: string, payload: AgentSyncIndexPayload): void;
    onSyncChunk?(deviceId: string, payload: AgentSyncChunkPayload): void;
    onSyncAck?(deviceId: string, payload: AgentSyncAckPayload): void;
    /** The agent is still working on an op locally; nothing to do but let the op wait longer. */
    onSyncBusy?(deviceId: string, payload: AgentSyncBusyPayload): void;
    onSyncOpResult?(deviceId: string, payload: AgentSyncOpResultPayload): void;
    /** The agent's X25519 public key, sent after every `sync.config` it receives. */
    onSyncDeviceKey?(deviceId: string, payload: AgentSyncDeviceKeyPayload): void;
}

/**
 * The named contracts the host holds (`sdk/providers.ts`): what the installed
 * modules offer on their services. Looked up at call time, `undefined` when
 * nobody offers the key; the caller degrades cleanly. A reader cannot tell who
 * offers a key, on purpose: a contract can change hands without anything
 * changing here.
 */
export interface SdkProviders {
    get<T>(key: string): T | undefined;
}

/** One object of an {@link SdkObjectStore}, as `list` yields it. */
export interface SdkStoredObject {
    key: string;
    size: number;
}

/**
 * Where a module keeps files (capability `'objects'`): the server's disk, or
 * the S3 bucket the host configured. A key is a relative path (`a/b/c`, no
 * `..`, no leading `/`); store only the KEY in your tables, never where it
 * resolves, so the host can move the whole tree (another disk, another
 * bucket) without a row to rewrite. Writes are atomic: a reader sees the
 * whole object or none.
 */
export interface SdkObjectStore {
    /** `'local'`: the server's disk. `'s3'`: every byte read costs egress. */
    readonly kind: 'local' | 's3';
    /** Where it lives, for a screen: « disque du serveur », « S3 : bucket ». */
    describe(): string;
    put(key: string, body: AsyncIterable<Uint8Array> | Uint8Array): Promise<{ size: number }>;
    /**
     * Stores a finished local file under `key`, then removes the local file:
     * a rename on the server's disk, an upload on S3. For a file assembled
     * in {@link spoolDir}.
     */
    putFile(key: string, localPath: string): Promise<{ size: number }>;
    /** The object's bytes, streamed. `range` is inclusive, like HTTP's. Throws when absent. */
    get(key: string, range?: { start: number; end?: number }): AsyncIterable<Buffer>;
    /** `null` when absent. */
    head(key: string): Promise<{ size: number } | null>;
    /** Every object whose key starts with `prefix`, in no guaranteed order. */
    list(prefix: string): AsyncIterable<SdkStoredObject>;
    /** Idempotent: an absent key is not an error. */
    delete(key: string): Promise<void>;
    /** Every object under `prefix`, which must end with `/`. */
    deletePrefix(prefix: string): Promise<void>;
    /**
     * A directory on the server's disk, whatever `kind`, for what cannot be
     * written as a whole object at once (a partial upload resumed later).
     * Yours alone; the store never cleans it.
     */
    spoolDir(): string;
    /**
     * The store's root when files written there would not last: on the
     * server's disk, inside a container, a directory on no mounted volume,
     * so its writable layer, wiped at the next redeploy. `null` otherwise,
     * and always on S3. Refuse to write there, naming the variable that sets
     * `localDir`: the files would vanish without a word.
     */
    ephemeralRoot(): Promise<string | null>;
}

/**
 * Raw bytes under the SERVER key, for wrapping module-owned key material; never
 * for user data, which goes through ciphers and the store. The host seals under
 * a sub-key of its own for each module: a blob sealed by one module never opens
 * in another, nor as one of the app's own sealed keys.
 */
export interface SdkServerKeys {
    /**
     * `context` binds the blob to the row it belongs to (authenticated, not
     * stored): pass the same string to `openBytes`. Recommended shape
     * `<table>:<column>:<id>`, so a blob copied onto another row does not open.
     */
    sealBytes(plain: Uint8Array, context?: string): string;
    /** null when the sealed blob cannot be opened (tampered, wrong context, or server keys changed). */
    openBytes(sealed: string, context?: string): Uint8Array | null;
    /**
     * A key DERIVED from the server key (HKDF-SHA256 over the same material
     * as `sealBytes`), never stored anywhere. For material that must survive
     * the database: a key kept in a table would sit inside the very backup it
     * protects. The same (salt, info) always yields the same key, as long as
     * `CRYPT_KEY_A`/`CRYPT_KEY_B` do not change.
     */
    derive(salt: string, info: string, length: number): Uint8Array;
}

/** A workspace device, as the devices facade reveals it. */
export interface SdkDevice {
    id: string;
    name: string;
    online: boolean;
    /** `active` is the only status whose agent the socket admits. */
    status: string;
    /** The account that enrolled the device (the actor of its audit lines). */
    ownerUserId: number;
    /** The workspace the device was paired in, or null once that workspace is gone. */
    workspaceId: number | null;
    /** The agent's metric cadence in seconds, null when it follows the default. */
    metricIntervalSeconds: number | null;
    /** The cadence the agent actually runs at: its own, or the default of its owner's plan. */
    effectiveMetricIntervalSeconds: number;
    /** The last OS/security report, null before the first one (or unreadable). */
    report: DeviceReport | null;
}

/** The session's password-encryption lock, seen from a handler. */
export interface SdkSecrecy {
    /**
     * True when the guarded tier is readable in this session: password-based
     * encryption is off for the account, or the session was unlocked. A
     * `'private'` read throws `locked` on its own; ask here when you need to
     * decide BEFORE reading (list rows as masked, refuse an edit that would
     * overwrite a body the session cannot see).
     */
    isUnlocked(): Promise<boolean>;
    /**
     * A short-lived ticket, signed by the host and bound to the caller (their
     * session, this workspace, YOUR module), carrying `payload`. Hand it to
     * the browser (a download URL, an OAuth `state`); a public route of your
     * service redeems it (`deps.secrecy.redeem`) into the caller's ciphers,
     * private tier included while the session is unlocked. The module never
     * sees a session id nor a key. Default life: two minutes.
     */
    ticket(payload: unknown, opts?: { ttlSeconds?: number }): Promise<string>;
}

/**
 * Your feature's items, as the workspace's roles see them. Items are the rows
 * a module declares with `hasItems`; both members answer for THIS feature.
 */
export interface SdkItems {
    /**
     * The items the caller's role sees differently from the others: `'none'`
     * hidden, `'read'` read-only, `'write'` writable where the feature grants
     * reading only. An override REPLACES what the feature gives, in both
     * directions. Empty for the owner and for a member without a role.
     * Listings filter with it.
     */
    restrictions(): Promise<ReadonlyMap<string, ItemAccess>>;
    /**
     * Throws `forbidden` unless THIS item is open to the caller at `level`
     * (default `'read'`), role restriction included. Commands that target one
     * item call it first.
     */
    assert(itemId: string, level?: FeatureAccess): Promise<void>;
    /**
     * Does the caller hold this extra permission ON THIS ITEM: the item's
     * override when it carries one, the role's grant otherwise. For a guard
     * that covers only part of a command (the dates of a card, say). A command
     * gated as a whole declares `access.extras` and needs nothing here.
     */
    canExtra(itemId: string, key: string): Promise<boolean>;
    /**
     * The item no longer exists: drops its projections, its role restrictions
     * and its notification route. Call it from your delete handler; nothing
     * links those rows to your table (the item lives in a different table per
     * feature), so without this call the next item to inherit the id would
     * inherit them too.
     */
    forget(itemId: string): Promise<void>;
}

/**
 * What is projected INTO the active workspace, for one listing or read.
 *
 * A shared item keeps a single home: it stays encrypted under its home
 * workspace's key, and is read elsewhere with that workspace's OPEN cipher.
 * `cipherFor` is the only path to it, and it only answers for items whose
 * projection really exists: an invented id yields the active workspace's own
 * cipher, never a foreign one.
 */
export interface SdkShareScope {
    /** The ids of the items projected into the active workspace from elsewhere. */
    readonly foreignIds: ReadonlySet<string>;
    /** The home workspace of a projected item, or null when it is at home. */
    homeOf(itemId: string): number | null;
    /** The open cipher of the workspace the item lives in (the active one when it is at home). */
    cipherFor(itemId: string): Promise<SdkCipher>;
    /**
     * The rank a projected item holds in the ACTIVE workspace, or null when it
     * is at home (its own table carries the rank there). Each workspace orders
     * what it sees independently.
     */
    orderOf(itemId: string): number | null;
}

/** Cross-workspace projection of your items (manifest `shareTier` other than `'never'`). */
export interface SdkSharing {
    /**
     * Loads what is projected into the active workspace. Once per listing or
     * read command; the result does not outlive the command.
     */
    scope(): Promise<SdkShareScope>;
    /**
     * Sets the rank of a projected item in the ACTIVE workspace. For an item
     * at home, rank belongs to your own table: write it there instead.
     */
    setOrder(itemId: string, order: number): Promise<void>;
}

/** Live invalidation from a background service, which writes without a command. */
export interface SdkLive {
    /**
     * Something of YOUR feature changed in this workspace: every member's
     * client re-fetches your declared resources (and, for a share-wired
     * feature, so do the workspaces linked by projections). Call it on state
     * transitions, never on every tick: each call re-fetches for everyone.
     * `topics` beats those instead of your id: your own secondary topics
     * (`manifest.topics`), or another feature's topic whose screens mirror
     * this data.
     */
    changed(workspaceId: number, topics?: readonly string[]): void;
    /**
     * Pushes one frame to every member of `workspaceId` connected right now
     * and holding `read` on YOUR feature (capability `'live.publish'`). The
     * client reads it with `onServerEvent(event, schema, cb)`.
     *
     * The lane for what must be seen AS it happens rather than re-fetched: a
     * cell someone just drew on a shared board. It carries the CHANGE, never
     * the whole state, and it is best-effort by construction, so a client that
     * missed one must be able to recover on its own (a periodic epoch, a
     * re-fetch on reconnection) rather than assume every frame lands.
     *
     * `event` must start with `<manifest.id>.`, like a command; a `requestId`
     * is never attached, so it can never be mistaken for a reply.
     */
    publish(workspaceId: number, event: string, payload: unknown): void;
    /** {@link SdkContextLive.accountChanged}, from a service (a webhook, a ticker). */
    accountChanged(userId: number): void;
}

/**
 * The live engine seen from a HANDLER, where the workspace is the caller's.
 * Invalidation stays declarative there (`mutates` on the command), so the only
 * thing left to do by hand is the push lane.
 */
export interface SdkContextLive {
    /** {@link SdkLive.publish}, in the workspace of the call. */
    publish(event: string, payload: unknown): void;
    /**
     * Something of this ACCOUNT changed (its plan, its subscription): its open
     * clients, in whatever workspace they sit, re-fetch the account plan and
     * your declared resources, and the host re-applies its `stock` limits
     * (pauses and resumes). No payload, so no capability.
     */
    accountChanged(userId: number): void;
}

/** The whole fleet, sessionless (capability `'devices.read'`), for services. */
export interface SdkFleetDevices {
    /** One device by id, whatever its workspace, or null. */
    find(deviceId: string): Promise<SdkDevice | null>;
    isOnline(deviceId: string): boolean;
}

/**
 * One of your feature's domains (manifest `domains`). Declared and verified
 * in the Domains tab the shell renders; your module only reads them.
 */
export interface SdkDomain {
    id: number;
    workspaceId: number;
    host: string;
    /** Published in the DNS by nature, so not a secret. */
    token: string;
    /**
     * Both stages have passed, neither has failed three times in a row since,
     * and the owner's plan does not hold the name paused. What decides
     * whether you serve it.
     */
    verified: boolean;
    verifiedAt: number | null;
    /** The owner's plan holds this name paused: it is not served until the limit rises. */
    planPaused: boolean;
}

/** Your feature's domains in the caller's workspace. Throws `forbidden` unless the manifest declares `domains`. */
export interface SdkDomains {
    list(): Promise<readonly SdkDomain[]>;
    get(id: number): Promise<SdkDomain | null>;
    verified(): Promise<readonly SdkDomain[]>;
}

/** Your feature's domains, sessionless: for a service or a public route. */
export interface SdkFleetDomains {
    /** Whatever the workspace. `host` is normalised for you: pass the raw `Host` header. */
    findByHost(host: string): Promise<SdkDomain | null>;
    get(workspaceId: number, id: number): Promise<SdkDomain | null>;
    listVerified(workspaceId: number): Promise<readonly SdkDomain[]>;
}

/** DNS lookups, injected so a probe is testable. A name that does not exist yields `[]`, not a throw. */
export interface SdkDns {
    /** One string per record, the 255-byte chunks rejoined. */
    txt(name: string): Promise<string[]>;
    mx(name: string): Promise<{ exchange: string; priority: number }[]>;
    cname(name: string): Promise<string[]>;
}

/** Where DevEye lives, see `SdkFeatureContext.origins`. */
export interface SdkOrigins {
    app: string;
    public: string;
    site: string | null;
}

/** What the domain hooks receive. Sessionless: they also run from the background pass. */
export interface FeatureDomainsContext<Repo = unknown> {
    repo: Repo;
    origins: SdkOrigins;
    /** Open tier only. */
    cipherFor(workspaceId: number): SdkCipher;
    storeFor(workspaceId: number): SessionlessFeatureStore;
    keys: SdkServerKeys;
    dns: SdkDns;
    logger: SdkLogger;
}

export type SdkDomainProbe = { ok: true } | { ok: false; error: string };

/**
 * Your half of domain verification, required when the manifest declares
 * `domains`. Ownership (the TXT record) is always DevEye's check; yours is
 * the second stage: is the domain really wired to what you serve?
 */
export interface FeatureDomainsEntry<Repo = unknown> {
    /** What to publish on top of the ownership record (a CNAME, an MX...). Shown in the records dialog. */
    records(ctx: FeatureDomainsContext<Repo>, domain: SdkDomain): Promise<readonly SdkDnsRecord[]>;
    /** Called only once ownership holds. A failed check is a returned sentence, never a throw. */
    probe(ctx: FeatureDomainsContext<Repo>, domain: SdkDomain): Promise<SdkDomainProbe>;
    /** How many of your items designate each domain, by domain id. Shown on the row and in the removal warning. */
    useCount?(
        ctx: FeatureDomainsContext<Repo>,
        workspaceId: number
    ): Promise<ReadonlyMap<number, number>>;
    /** Runs before the row is deleted: drop your references. A throw aborts the removal. */
    onRemoved?(ctx: FeatureDomainsContext<Repo>, domain: SdkDomain): Promise<void>;
}

/** What a handler receives. One request, one workspace, rights pre-resolved. */
export interface SdkFeatureContext<Repo = unknown> {
    userId: number;
    workspaceId: number;
    workspace: { id: number; kind: 'personal' | 'shared'; name: string };
    isOwner: boolean;
    /**
     * The caller is a global administrator of this DevEye. What a fleet-wide
     * view keys on (the admin in their personal workspace sees every device);
     * a command that must REQUIRE it declares `access: { admin: true }`.
     */
    isAdmin: boolean;
    /** Caller's level on THIS feature. `read` is already guaranteed by the dispatcher. */
    canWrite: boolean;
    /** Extra permission of type `toggle`. Absent from the grant = false; owner = true. */
    canExtra(key: string): boolean;
    /** Extra permission of type `choice`. Absent = the spec's default; owner = ownerValue. */
    extraValue(key: string): string;
    /** Your repo, built once per process by `server.createRepo`. */
    repo: Repo;
    /** Per-feature, per-workspace KV storage. */
    store: FeatureStore;
    /** Cipher for your own tables. Default `'server'`; see {@link StorageEncryption}. */
    cipher(mode?: 'server' | 'private'): SdkCipher;
    /** Native features, gated by your manifest's `nativeCapabilities`. */
    deveye: DevEyeFacade;
    /** The caller's socket (capability `'agents'`); every method throws `forbidden` otherwise. */
    transport: SdkSocketTransport;
    /** The session's password-encryption lock. */
    secrecy: SdkSecrecy;
    /** Your items as the roles see them (restrictions), and their removal bookkeeping. */
    items: SdkItems;
    quota: SdkQuota;
    /** Projections into the active workspace. Throws `forbidden` when the manifest says `shareTier: 'never'`. */
    sharing: SdkSharing;
    /** Your feature's domains in this workspace (manifest `domains`). */
    domains: SdkDomains;
    /** The named contracts the host holds, see `SdkProviders`. */
    providers: SdkProviders;
    /** Fire-and-forget audit line; actor, IP and workspace are pre-bound. */
    audit(entry: {
        action: string;
        description: string;
        level?: LogLevelName;
        metadata?: Record<string, unknown> | null;
    }): void;
    logger: SdkLogger;
    requestId: string;
    /**
     * Report how far this command has got, to its caller only. Best effort, at
     * most 4 frames a second (the last one always goes out); each frame re-arms
     * the caller's timeout, so a long command that keeps reporting never times
     * out. Steps are user-facing sentences.
     */
    progress(update: CommandProgress): void;
    /** The server key derivations, the same `keys` a service gets. */
    keys: SdkServerKeys;
    /** The push lane, in this workspace (capability `'live.publish'`). */
    live: SdkContextLive;
    /**
     * Where DevEye lives, as URLs without a trailing slash: `app` is the
     * origin members use (`PUBLIC_ORIGIN`), `public` the one anyone reaches
     * the public routes by, which differs when the host serves them on a
     * domain of their own, the app itself possibly staying private (else the
     * same). `site` is the marketing site (`SITE_URL`), where the legal pages
     * live (`/cgu`, `/cgv`, `/confidentialite`, `/mentions-legales`); `null`
     * when the host has none.
     * For what a module hands to the outside world (an install snippet, a
     * callback URL): never derive it from the browser's location.
     */
    origins: SdkOrigins;
}

/**
 * One command your module handles. The dispatcher validates `input` before the
 * handler and `output` after it, enforces `access` first, and broadcasts your
 * feature's live topic after a successful `mutates` command so every member's
 * client re-fetches your declared resources.
 */
export interface SdkFeatureDefinition<
    Repo = unknown,
    Cmd extends string = string,
    I extends ZodType = ZodType,
    O extends ZodType = ZodType
> {
    command: Cmd;
    input: I;
    output: O;
    /**
     * `level`: the caller's level on your feature (`read` by default).
     * `extras`: the extra permissions the caller must hold, ALL required.
     * `admin`: the caller must be a global administrator; the feature check
     * still applies. Your feature id is implied: you cannot gate on another
     * feature's rights.
     * `scope: 'account'`: the command acts on the caller's ACCOUNT, not on a
     * workspace. The host runs it in the caller's personal workspace whatever
     * the client sent, so the role held in a shared workspace never decides.
     */
    access?: {
        level?: FeatureAccess;
        extras?: readonly string[];
        admin?: boolean;
        scope?: 'account';
    };
    /**
     * This command changes data other members can see. `true` beats your
     * feature's own live topic (its id); a list names the topics to beat
     * instead: your id, one of your `manifest.topics`, or another feature's
     * topic (native or module) whose screens mirror this data (Projects when a
     * linked item goes away). An unknown topic is refused at boot.
     */
    mutates?: boolean | readonly string[];
    handler(ctx: SdkFeatureContext<Repo>, input: z.output<I>): Promise<z.input<O>>;
}

/** Identity helper for type inference, mirroring the native `defineFeature`. */
export function defineSdkFeature<Repo, Cmd extends string, I extends ZodType, O extends ZodType>(
    def: SdkFeatureDefinition<Repo, Cmd, I, O>
): SdkFeatureDefinition<Repo, Cmd, I, O> {
    return def;
}

/** The request a public route sees: headers, decoded body, client address. Nothing of a session. */
export interface SdkPublicRequest {
    headers: Readonly<Record<string, string | string[] | undefined>>;
    /** The JSON body, already decoded (`undefined` when absent or unreadable). */
    body: unknown;
    /**
     * The body exactly as received, on a route that asked for it
     * (`SdkPublicRouteOptions.rawBody`). What a webhook signature is computed
     * over: re-serialising `body` would not give the same bytes.
     */
    rawBody?: string;
    /**
     * The query string, decoded by the host into an object (`?a=1&b=2` reads
     * `{ a: '1', b: '2' }`). `unknown` like `body`: read it through a schema.
     * What a ticketed GET (a download URL, an OAuth callback) carries.
     */
    query?: unknown;
    /**
     * Path parameters the host decoded (`/rdv/:ref` reads `{ ref: 'abc' }`).
     * `unknown` like `body` and `query`: re-read it through a schema. Absent
     * from a route that declares none.
     */
    params?: unknown;
    /**
     * The request's host, normalised by the host: `Host`, or `X-Forwarded-Host`
     * behind a trusted proxy, port included. UNTRUSTED data: it proves nothing,
     * it only picks among what the database already verified.
     */
    host?: string;
    ip: string;
}

/** The reply of a public route, the minimal chainable surface the host maps onto its HTTP server. */
export interface SdkPublicReply {
    header(name: string, value: string): SdkPublicReply;
    code(status: number): SdkPublicReply;
    send(payload?: unknown): unknown;
}

export interface SdkPublicRouteOptions {
    /** A ceiling per client address, on top of the host's own: `{ max, timeWindow: '1 minute' }`. */
    rateLimit?: { max: number; timeWindow: string };
    /**
     * Which listeners serve the route. `'everywhere'` (default): the app and
     * the public surface, for what the outside world calls (a beacon).
     * `'app'`: the app's own origin only, for what the logged-in browser
     * fetches without a session header (a ticketed download, an OAuth
     * callback that lands back in the app).
     */
    exposure?: 'everywhere' | 'app';
    /** Also hand the handler the undecoded body (`SdkPublicRequest.rawBody`). JSON bodies only. */
    rawBody?: boolean;
    /**
     * Largest body this route accepts, in bytes. Size it on the biggest
     * legitimate call: the host default is a megabyte, which is orders of
     * magnitude above what a beacon or a form sends, and every byte of it is
     * parsed before your schema sees anything.
     */
    bodyLimit?: number;
}

/** What a redeemed ticket gives a public route back (see `SdkSecrecy.ticket`). */
export interface SdkRedeemedTicket {
    userId: number;
    workspaceId: number;
    payload: unknown;
    /** The caller's ciphers: the open tier always, the private tier while their session is unlocked. */
    cipher: { server: SdkCipher; private: SdkCipher | null };
}

export type SdkPublicHandler = (req: SdkPublicRequest, reply: SdkPublicReply) => Promise<unknown>;

/**
 * The body of a streamed route: never decoded, never buffered. The HOST counts
 * the bytes and cuts the connection at `maxBytes`, so a module that forgets to
 * count cannot open a bottomless pit.
 */
export interface SdkPublicStreamBody {
    /** The announced `Content-Length`, `null` when chunked. Unverified: compare it with what you read. */
    contentLength: number | null;
    /** The bytes, in order. Throws `FeatureError('validation')` past `maxBytes`. Consumable once. */
    bytes(): AsyncIterable<Buffer>;
}

/** The request of a streamed route: the same, its decoded body replaced by its bytes. */
export interface SdkPublicStreamRequest extends Omit<SdkPublicRequest, 'body' | 'rawBody'> {
    body: SdkPublicStreamBody;
}

export interface SdkPublicStreamRouteOptions {
    /** Counts REQUESTS, not bytes: a 5 GiB upload is one request. Not what protects the disk. */
    rateLimit?: { max: number; timeWindow: string };
    /** Absolute ceiling of the body, enforced by the host. A per-account ceiling is yours to check on top. */
    maxBytes: number;
    /** Written, not defaulted: a route that swallows gigabytes never opens on the public listener by omission. */
    exposure: 'app';
}

export type SdkPublicStreamHandler = (
    req: SdkPublicStreamRequest,
    reply: SdkPublicReply
) => Promise<unknown>;

/**
 * Where a module declares its public routes (capability `'routes.public'`).
 * Paths are absolute (`/t.js`, `/api/t/b`); a path the host already serves
 * is refused at boot. Every route is registered on every public listener.
 * `/` belongs to the host: a page served at the root of a customer domain goes
 * through `FeatureService.domainRoot`.
 */
export interface SdkPublicApp {
    get(path: string, opts: SdkPublicRouteOptions, handler: SdkPublicHandler): void;
    post(path: string, opts: SdkPublicRouteOptions, handler: SdkPublicHandler): void;
    /**
     * A POST whose body is NOT decoded: the host hands it over as a bounded
     * stream, whatever its content type. For what no parser should ever hold in
     * full, an uploaded file. No path parameter, app origin only, and kept out
     * of the CORS-widened paths: authenticate it with a ticket (`SdkSecrecy.ticket`).
     */
    postStream(
        path: string,
        opts: SdkPublicStreamRouteOptions,
        handler: SdkPublicStreamHandler
    ): void;
}

/**
 * A background worker. Started during boot (awaited, before the agent socket
 * layer registers), stopped on shutdown. A full-stop maintenance of the feature
 * also stops it at runtime, then calls `start()` again on the same object: stop
 * must resolve once the work in flight is finished or interrupted, and leave
 * nothing that would break a second start. Stopping a stopped service is a no-op.
 */
export interface FeatureService {
    start(): void | Promise<void>;
    stop(): void | Promise<void>;
    /** Inbound agent events this module wants (requires capability `'agents'`). */
    agentHooks?: FeatureAgentHooks;
    /**
     * Named contracts offered to the host app (see `sdk/providers.ts`): the
     * inversion for public code that needs a module's data. The app looks a
     * provider up at call time and degrades cleanly when the module is absent.
     */
    providers?: Readonly<Record<string, unknown>>;
    /**
     * Your public HTTP routes, declared once at boot (capability
     * `'routes.public'`). Called by the host for each listener it exposes to
     * the outside; register the same routes each time.
     */
    publicRoutes?(app: SdkPublicApp): void;
    /**
     * The page served at the root (`GET /`) of one of YOUR verified web
     * domains, for a name that is the page itself (`status.example.com`)
     * rather than a prefix of your routes. Called only once the request's
     * host matched a verified domain of your feature, on every listener that
     * receives it, behind the maintenance gate. Route by `domain`, never by the
     * header. When several features verified the same name, the first
     * installed that declares `domainRoot` answers. Requires capability
     * `'routes.public'` and manifest `domains.web`.
     */
    domainRoot?(req: SdkPublicRequest, reply: SdkPublicReply, domain: SdkDomain): Promise<unknown>;
    /**
     * Your `stock` items that a plan just paused or resumed, once written: for
     * what you hold OPEN (a connection, a session, a timer). What you run on
     * schedule needs nothing here, it reads `SdkPlanPauses` each time. Never
     * called while your service is halted by maintenance.
     */
    onPlanPause?(change: SdkPlanPauseChange): void | Promise<void>;
    /**
     * An account is about to be deleted, with everything it owns: end what
     * you hold for it elsewhere (a subscription with a payment provider). Your
     * rows go with the account (`ON DELETE CASCADE`), nothing to do for them.
     * Runs before the row is deleted: a throw aborts the deletion. Never called
     * while your service is halted by maintenance: the deletion is refused then.
     * Return a note when the holder must learn something of yours (their
     * subscription stopped): it joins the confirmation email they receive.
     */
    onAccountDeleted?(
        userId: number
    ): void | SdkAccountDeletedNote | Promise<void | SdkAccountDeletedNote>;
    /**
     * What your service knows of its own health that the host cannot see: a
     * port it failed to open, an engine it depends on. Read by the public
     * status page about once a minute. Answer from memory: no network call, no
     * write, no heavy query; after 2 s the host counts you as degraded. Omit it
     * when the process and the database are all you rely on: the host already
     * watches those, along with your failing tickers and commands.
     */
    health?(): SdkServiceHealth | Promise<SdkServiceHealth>;
}

/** A service's own verdict on itself, as `FeatureService.health` gives it. */
export interface SdkServiceHealth {
    state: 'up' | 'degraded' | 'down';
    /** Shown on the public status page: a short sentence for users, never an internal detail. */
    reason?: string;
}

/** One paragraph of yours in the email confirming an account's deletion to its holder. */
export interface SdkAccountDeletedNote {
    paragraph: string;
}

/**
 * What `createService` receives. Note what is absent: no session, no guarded
 * cipher, no way to read `'private'` data. Background work runs sessionless.
 */
export interface FeatureServiceDeps<Repo = unknown> {
    repo: Repo;
    /** Workspaces where your feature is currently granted to at least the owner (i.e. all of them). */
    listWorkspaceIds(): Promise<number[]>;
    storeFor(workspaceId: number): SessionlessFeatureStore;
    /** Open tier only. */
    cipherFor(workspaceId: number): SdkCipher;
    /** Sessionless-safe facade subset. */
    deveyeFor(workspaceId: number): Pick<DevEyeFacade, 'notify'>;
    /** Devices of one workspace, sessionless (capability `'devices.read'`). */
    devicesFor(workspaceId: number): Pick<DevEyeFacade['devices'], 'list' | 'isOnline'>;
    /** Members of one workspace, owner included, sessionless (capability `'members.read'`): a name a public page shows. */
    membersFor(workspaceId: number): DevEyeFacade['members'];
    /** The whole fleet by id, sessionless (capability `'devices.read'`). */
    devices: SdkFleetDevices;
    /** Capability `'accounts.read'`. */
    accounts: SdkAccounts;
    /** Capability `'accounts.usage'`. */
    usage: SdkUsage;
    /** Capability `'accounts.mail'`. */
    accountMail: SdkAccountMail;
    /**
     * {@link SdkQuota} for a workspace, sessionless: for what gets created
     * outside any command (bytes an agent uploads). Same account rule, the
     * owner of that workspace.
     */
    quotaFor(workspaceId: number): SdkQuota;
    /** Your paused `stock` items, whatever the workspace. */
    pauses: SdkPlanPauses;
    /** The devices' telemetry, sessionless (capability `'telemetry.read'`). */
    telemetry: SdkTelemetry;
    /** Live invalidation of your feature's resources, from a service. */
    live: SdkLive;
    /**
     * Audit line recorded as the SYSTEM (no session). `userId` attributes the
     * line to a user when the work concerns their data.
     */
    audit(entry: {
        action: string;
        description: string;
        level?: LogLevelName;
        userId?: number;
        metadata?: Record<string, unknown> | null;
    }): void;
    /** The agent-fleet transport (capability `'agents'`). */
    agents: AgentsFacade;
    /**
     * What a member may do NOW, without a session: for work that runs on a
     * member's behalf long after they set it up (a nightly backup of their
     * machine), and must stop when they lose the right. The rules of a
     * command: account not suspended, membership, role, the item's
     * override. `feature` answers for YOUR feature only. `device` answers
     * for the Devices permissions on one device (capability
     * `'devices.read'`), with the rule of `devices.authorize`: an override
     * that lowers the device to read-only closes it.
     */
    access: {
        feature(
            workspaceId: number,
            userId: number,
            need: { level?: FeatureAccess; extras?: readonly string[]; itemId?: string }
        ): Promise<SdkAccessVerdict>;
        device(
            workspaceId: number,
            userId: number,
            deviceId: string,
            extras: readonly string[]
        ): Promise<SdkAccessVerdict>;
    };
    /** Raw key wrapping under the server key, and derived keys. */
    keys: SdkServerKeys;
    /**
     * The object store (capability `'objects'`). `localDir` is where your
     * objects live while the host keeps them on its disk, typically a path of
     * your `env`; with an S3 configured, it only holds your `spoolDir()`.
     */
    objects(localDir: string): SdkObjectStore;
    /** Redeems a ticket minted by `ctx.secrecy.ticket` of THIS module; `null` when invalid, expired or another module's. */
    secrecy: { redeem(ticket: string): Promise<SdkRedeemedTicket | null> };
    /** Where DevEye lives (the same `origins` a request context gets): for a page or a link a route hands to the browser. */
    origins: SdkOrigins;
    /** Your feature's domains, whatever the workspace (manifest `domains`). */
    domains: SdkFleetDomains;
    /** The named contracts the host holds, see `SdkProviders`. */
    providers: SdkProviders;
    /**
     * The app's standard loop: setInterval + reentrancy guard + unref, the
     * exact pattern of every native service. Use it instead of rolling your own.
     * `stop()` resolves once the tick in flight, if any, has finished: await it.
     */
    createTicker(opts: { intervalMs: number; tick(): Promise<void> }): FeatureService;
    logger: SdkLogger;
}

/**
 * Your package's `./server` export.
 */
export interface FeatureServer<Repo = unknown> {
    /** Built once per process, shared by handlers and the service. */
    createRepo?(q: SdkQueryable): Repo;
    features: readonly SdkFeatureDefinition<Repo, string, ZodType, ZodType>[];
    /**
     * Absolute path to this module's `migrations/` directory (derive it from
     * `import.meta.url`). Files are `001_name.sql`, applied in order, recorded
     * as `<feature-id>/<filename>`, after all core migrations. Never edit a
     * shipped migration; add a new number.
     */
    migrationsDir?: string;
    createService?(deps: FeatureServiceDeps<Repo>): FeatureService;
    /**
     * What the app needs to know about your items without opening your
     * feature: required for a `shareTier` other than `'never'` (the sharing
     * commands must find an item's home), useful to any `hasItems` feature that
     * notifies (the channels screen names the item a route points to).
     */
    items?: FeatureItemsEntry<Repo>;
    /** Required when the manifest declares `domains`, refused otherwise. */
    domains?: FeatureDomainsEntry<Repo>;
    /**
     * What the holder's data export writes of your feature (GDPR
     * portability): see {@link FeatureAccountExport}. Required once your
     * feature owns a table; without tables, the host exports your store alone.
     */
    accountExport?: FeatureAccountExport<Repo>;
    /** One entry per quota of the manifest, by its key, `perOperation` ones excepted, and none other. */
    quotas?: Readonly<Record<string, FeatureQuotaEntry<Repo>>>;
    /**
     * The environment variables you read, as the spec you read them with
     * (`defineModuleEnv`). Plain data: the host reads it again at boot and
     * warns about every variable left to its default.
     */
    env?: ModuleEnvSpec;
    /**
     * The external services you depend on at the instance level (a provider
     * reached with the instance's own key), and their state: shown on the
     * administrator's "Services externes" page each time it is opened or
     * refreshed. Network calls are allowed; the host gives up after 8 s and
     * shows them as not answering. Cache what is costly to read. Never a
     * service a workspace sets up itself.
     */
    externalServices?(
        ctx: SdkExternalServicesContext<Repo>
    ): Promise<readonly SdkExternalService[]>;
    /**
     * Every email you send, on made-up data, for the administrator's mail
     * tester: built by the SAME function as the real one, or the tester proves
     * nothing. `sender: 'server'` requires capability `'accounts.mail'`. Keys
     * are unique within your feature.
     */
    mailSamples?: readonly SdkMailSample[];
    /** Your end-to-end scenarios, run by an administrator against this very server. */
    e2e?: FeatureE2eEntry<Repo>;
}

/** What `FeatureServer.externalServices` is called with. */
export interface SdkExternalServicesContext<Repo = unknown> {
    repo: Repo;
    /** The administrator asked to check again: skip your cache. */
    refresh: boolean;
}

/** One card of the "Services externes" page. */
export type SdkExternalService = ExternalService;

/** What a mail sample is built with. */
export interface SdkMailSampleContext {
    origins: SdkOrigins;
    /** Milliseconds since the epoch. */
    now: number;
}

/** A message a workspace mailbox sends: what `MailTransportProvider.send` takes, the recipient aside. */
export type SdkWorkspaceMail = Omit<MailTransportMessage, 'to'>;

export type SdkMailSample = {
    /** `[a-z][a-zA-Z0-9]*`, unique within your feature. */
    key: string;
    /** What the tester lists, in the interface's language. */
    label: string;
} & (
    | {
          /** From the server's own sender, as `accountMail.send` would. */
          sender: 'server';
          build(ctx: SdkMailSampleContext): SdkAccountMailMessage | Promise<SdkAccountMailMessage>;
      }
    | {
          /** From a workspace mailbox the administrator picks, as `MAIL_TRANSPORT_PROVIDER` would. */
          sender: 'workspace';
          build(ctx: SdkMailSampleContext): SdkWorkspaceMail | Promise<SdkWorkspaceMail>;
      }
);

/** The throwaway account a scenario runs as. It owns `workspaceId` and is deleted with all it owns afterwards. */
export interface SdkE2eAccount {
    userId: number;
    username: string;
    email: string;
    password: string;
    /** Its personal workspace. */
    workspaceId: number;
}

export interface SdkE2eContext<Repo = unknown> {
    account: SdkE2eAccount;
    /**
     * A command through a real socket of that account and the whole
     * dispatcher. Rejects with a `FeatureError` carrying the server's code.
     */
    send<T = unknown>(command: string, input: unknown, opts?: { workspaceId?: number }): Promise<T>;
    /** A sessionless request to this server's own listener: what a visitor's browser sends to a public route. */
    fetch(
        path: string,
        init?: { method?: 'GET' | 'POST'; headers?: Record<string, string>; body?: string }
    ): Promise<{ status: number; body: string }>;
    /**
     * Polls until `probe` answers something other than `null`, `undefined` or
     * `false`, then resolves with it. Rejects after `timeoutMs` (default 10 s),
     * saying `what` was awaited.
     */
    waitFor<T>(
        probe: () => Promise<T | null | undefined | false>,
        opts?: { timeoutMs?: number; intervalMs?: number; what?: string }
    ): Promise<T>;
    /**
     * Undoes something once the steps are over, whatever happened, last
     * registered first, while the account still exists. Register the undo
     * right after the thing is created, before anything can fail.
     */
    defer(label: string, undo: () => Promise<void>): void;
    /** Shared between the steps of one run. */
    state: Map<string, unknown>;
    repo: Repo;
    origins: SdkOrigins;
    /** Aborted when the administrator stops the run or a timeout fires. */
    signal: AbortSignal;
}

export interface SdkE2eStep<Repo = unknown> {
    /** What the report shows, in the interface's language. */
    label: string;
    /** Longer than the default 20 s: a step that waits on a third party (a payment provider's webhook). */
    timeoutMs?: number;
    /** Throws to fail. A returned string is shown as the step's detail. */
    run(ctx: SdkE2eContext<Repo>): Promise<string | void>;
}

export interface SdkE2eScenario<Repo = unknown> {
    /** `[a-z][a-zA-Z0-9]*`, unique within your feature. */
    id: string;
    label: string;
    /** Why it cannot run here right now, or `null`. Asked before every run. */
    skip?(ctx: { origins: SdkOrigins }): string | null | Promise<string | null>;
    steps: readonly SdkE2eStep<Repo>[];
}

export interface FeatureE2eEntry<Repo = unknown> {
    scenarios: readonly SdkE2eScenario<Repo>[];
    /**
     * Removes what a crashed run left OUTSIDE the test accounts (an object at
     * a payment provider): what lives in your tables goes with the account.
     * Called at boot, before and after every run. Idempotent; a throw keeps
     * the run marked as leaving residue.
     */
    sweep?(): Promise<void>;
}

/**
 * Your items, seen from the app's transversal commands (sharing, notification
 * routes). Both calls are sessionless as far as you are concerned: the repo is
 * yours, the cipher is the OPEN cipher of the calling workspace.
 */
export interface FeatureItemsEntry<Repo = unknown> {
    /**
     * The workspace an item lives in, when it is visible from `workspaceId`
     * (its own, or one it is projected into); null when it does not exist
     * there. The sharing commands rely on it to tell a home from a window.
     */
    homeOf(repo: Repo, itemId: string, workspaceId: number): Promise<number | null>;
    /**
     * The item's display name, decrypted with `cipher` (the open cipher of
     * `workspaceId`), or null when the item is gone or unreadable. Names the
     * target a notification route points to; null reads as "a target that
     * disappeared", which is exactly what the screen must show then.
     */
    labelOf(
        repo: Repo,
        cipher: SdkCipher,
        itemId: string,
        workspaceId: number
    ): Promise<string | null>;
    /**
     * May this item be projected into another workspace? Omit when every item
     * of yours can (an open-tier feature). A `'perItem'` feature answers
     * `false` for an item encrypted under the caller's password (its guarded
     * tier): no other workspace could read it, so the share is refused at the
     * moment it is asked, with a message that says why. Called with the item's
     * HOME workspace.
     */
    shareable?(repo: Repo, itemId: string, workspaceId: number): Promise<boolean>;
    /**
     * Move this item to another workspace. The ONLY operation of the whole
     * system that re-encrypts (read under key A, written under key B); every
     * other one keeps a blob under the key it was sealed with. Omit it and
     * your items cannot be moved: the screen offers nothing and `item.move`
     * refuses. That default is the safe one, and staying on it is a valid
     * answer for a feature whose item depends on a workspace source (a
     * credential, a destination) that cannot follow it.
     */
    move?: FeatureItemsMove<Repo>;
    /**
     * Copy this item to another workspace, of this DevEye or of ANOTHER one.
     * You describe what the item is made of, the app reads and writes it (see
     * `copy.ts`). Omit it and your items cannot be copied: the screen says so.
     */
    copy?: FeatureItemsCopy<Repo>;
}

/** What copying one item leaves behind, decided on the SOURCE before a row is read. */
export interface SdkCopyPlan {
    /** Why the copy is impossible, in sentences the screen shows as they are. Empty means it can go. */
    blockers: readonly string[];
    /**
     * What the copy will NOT carry, named one by one for the confirmation: a
     * token of the origin workspace, a history the destination rebuilds.
     */
    drops: readonly string[];
    /**
     * What the copy DOES carry and nobody would guess: a secret the destination
     * will be able to read, such as a password the item authenticates with.
     * Optional, because most items have nothing to declare here; say it and the
     * confirmation lists it, or whoever copies never learns it.
     */
    carries?: readonly string[];
}

/** See {@link FeatureItemsEntry.copy}. */
export interface FeatureItemsCopy<Repo = unknown> {
    /**
     * What an item is made of. Build your `move` cells from the same tree
     * (`movableCellsOf`) and you hold one list instead of two.
     */
    tree: ItemTree;
    /** SOURCE side. Reads only; the destination is unknown here, it may be another DevEye. */
    plan?(ctx: FeatureItemsCopyPlanContext<Repo>): Promise<SdkCopyPlan>;
    /**
     * DESTINATION side, inside the transaction, before the first row is
     * written. Refuse by throwing a `FeatureError` (a name already taken there,
     * a quota reached), or amend `rows` in place: they are in the clear (a
     * title to suffix, a derived column to recompute).
     */
    admit?(ctx: FeatureItemsCopyAdmitContext<Repo>): Promise<void>;
    /**
     * DESTINATION side, same transaction, once the rows are written: give the
     * copy its place (the end of its list).
     */
    settle?(ctx: FeatureItemsCopySettleContext<Repo>): Promise<void>;
}

export interface FeatureItemsCopyPlanContext<Repo = unknown> {
    q: SdkQueryable;
    repo: Repo;
    itemId: string;
    workspaceId: number;
}

export interface FeatureItemsCopyAdmitContext<Repo = unknown> {
    /** Transactional, see {@link FeatureItemsMoveContext.q}. */
    q: SdkQueryable;
    /** Your repo. For reads only. */
    repo: Repo;
    toWorkspaceId: number;
    /** The rows about to be written, sealed cells in the clear. Yours to amend. */
    rows: ItemTreeRows;
    /** The quotas of the DESTINATION workspace's owner, as `ctx.quota` in a handler. */
    quota: SdkQuota;
}

export interface FeatureItemsCopySettleContext<Repo = unknown> {
    /** Transactional, see {@link FeatureItemsMoveContext.q}. */
    q: SdkQueryable;
    repo: Repo;
    toWorkspaceId: number;
    /** The id the copy was given. */
    itemId: string;
}

/**
 * What moving one item would cost, decided while it is still at home and
 * before a single row is written.
 */
export interface SdkMovePlan {
    /**
     * Why the move is impossible, in sentences the screen shows as they are.
     * Empty means it can go. Put the decisive one first: a name already taken
     * in the target, a source of the origin workspace that cannot follow.
     */
    blockers: readonly string[];
    /**
     * What the move destroys, named one by one, for the confirmation to list
     * verbatim: a history left behind, a setting that means nothing there.
     * Say it here or the caller discovers it afterwards.
     */
    drops: readonly string[];
    /**
     * What follows the item and nobody would guess: a secret the destination
     * workspace will be able to read. Optional, same contract as
     * {@link SdkCopyPlan.carries}.
     */
    carries?: readonly string[];
    /**
     * Encrypted cells to convert, so the confirmation can say how much rather
     * than spin. An estimate is fine; zero is a legitimate answer.
     */
    rows: number;
}

/** See {@link FeatureItemsEntry.move}. */
export interface FeatureItemsMove<Repo = unknown> {
    /**
     * Everything the confirmation must say, and every refusal, with the item
     * still at home and nothing written yet. Answer for THAT target: a name
     * collision or a missing source is decidable only against it.
     */
    plan(ctx: FeatureItemsMovePlanContext<Repo>): Promise<SdkMovePlan>;
    /**
     * Re-home the item: `workspace_id` on every row it owns, and every
     * encrypted cell read with `ciphers.from` and written with `ciphers.to`.
     *
     * Read and convert EVERYTHING before the first write. A tree half
     * converted is unreadable forever and nothing can detect it: one encrypted
     * blob is indistinguishable from another. `reencryptProjectTree` in the
     * Projects module is the reference implementation.
     */
    apply(ctx: FeatureItemsMoveContext<Repo>): Promise<void>;
}

/** The handles {@link FeatureItemsMove.plan} works with. Reads only. */
export interface FeatureItemsMovePlanContext<Repo = unknown> {
    /** Not transactional: planning writes nothing. {@link countMovableCells} takes it. */
    q: SdkQueryable;
    repo: Repo;
    itemId: string;
    fromWorkspaceId: number;
    toWorkspaceId: number;
}

/** The handles {@link FeatureItemsMove.apply} works with. */
export interface FeatureItemsMoveContext<Repo = unknown> {
    /**
     * Transactional: what you write here commits with the app's own cleanup,
     * or rolls back with it. Write through this, NEVER through `repo`, which
     * is bound to the pool and would land outside the transaction.
     */
    q: SdkQueryable;
    /** Your repo. For reads only, see `q`. */
    repo: Repo;
    itemId: string;
    fromWorkspaceId: number;
    toWorkspaceId: number;
    /** The open ciphers of the two workspaces: decrypt with `from`, seal with `to`. */
    ciphers: { from: SdkCipher; to: SdkCipher };
}

/**
 * One column of encrypted text hanging off an item, for {@link resealCells}.
 *
 * ⚠️ The list you build out of these is held BY HAND: an encrypted column left
 * out of it stays under the old key and becomes unreadable, and nothing can
 * detect it, one encrypted blob being indistinguishable from another. Revisit
 * it whenever you add an encrypted column.
 */
export interface MovableCell {
    table: string;
    /** Identifying column of the row, to rewrite exactly one. */
    idColumn: string;
    /** Column tying the row to the item. */
    ownerColumn: string;
    column: string;
    /**
     * For a row hanging off the item INDIRECTLY: a SQL subquery selecting the
     * `ownerColumn` values that belong to it, taking the item's id as its only
     * `?` (a mail account's messages hang off its folders:
     * `SELECT id FROM mail_folders WHERE account_id = ?`).
     *
     * Interpolated into the query, so it must be a literal written in your
     * module, exactly like `table` and `column`. Never build it from input.
     */
    ownerScope?: string;
}

/** `WHERE` fragment tying a cell's rows to the item, subquery included. */
function ownerFilter(cell: MovableCell): string {
    return cell.ownerScope
        ? `${cell.ownerColumn} IN (${cell.ownerScope})`
        : `${cell.ownerColumn} = ?`;
}

/** Rows rewritten per `UPDATE` by {@link resealCells}. */
const RESEAL_BATCH = 100;

/** How many cells {@link resealCells} would convert: a `plan`'s `rows`. */
export async function countMovableCells(
    q: SdkQueryable,
    cells: readonly MovableCell[],
    ownerId: string | number
): Promise<number> {
    let total = 0;
    for (const cell of cells) {
        const rows = await q.query<{ n: number }>(
            `SELECT COUNT(*) AS n FROM ${cell.table}
              WHERE ${ownerFilter(cell)} AND ${cell.column} IS NOT NULL AND ${cell.column} <> ''`,
            [ownerId]
        );
        total += Number(rows[0]?.n ?? 0);
    }
    return total;
}

/**
 * Re-seals every encrypted cell of an item from one workspace's key to
 * another's, for a `move`'s `apply`.
 *
 * Reads and converts EVERYTHING before the first write, and throws before
 * writing anything if one cell resists: half a converted tree is unreadable
 * forever. Call it before you change the item's `workspace_id`, so a failure
 * leaves the item where it was.
 */
export async function resealCells(
    q: SdkQueryable,
    cells: readonly MovableCell[],
    ownerId: string | number,
    ciphers: { from: SdkCipher; to: SdkCipher }
): Promise<number> {
    const pending: { cell: MovableCell; id: string | number; value: string }[] = [];
    for (const cell of cells) {
        // A cell that is empty has nothing to convert, and that is the common
        // case for an error message or an optional body.
        const rows = await q.query<{ row_id: string | number; value: string }>(
            `SELECT ${cell.idColumn} AS row_id, ${cell.column} AS value FROM ${cell.table}
              WHERE ${ownerFilter(cell)} AND ${cell.column} IS NOT NULL AND ${cell.column} <> ''`,
            [ownerId]
        );
        for (const row of rows) {
            const plain = await ciphers.from.tryDecrypt(String(row.value));
            if (plain === null) {
                throw new FeatureError(
                    'internal',
                    `Une ligne de ${cell.table} est illisible : déplacement annulé, rien n’a été modifié.`
                );
            }
            pending.push({ cell, id: row.row_id, value: await ciphers.to.encrypt(plain) });
        }
    }

    // Par paquets et non ligne à ligne : un dépôt de quelques milliers de
    // commits vaut autant d'allers-retours, et le geste doit tenir en secondes.
    for (const cell of cells) {
        const mine = pending.filter((p) => p.cell === cell);
        for (let at = 0; at < mine.length; at += RESEAL_BATCH) {
            const batch = mine.slice(at, at + RESEAL_BATCH);
            const cases = batch.map(() => 'WHEN ? THEN ?').join(' ');
            const ids = batch.map(() => '?').join(', ');
            // La garde du propriétaire dans le `WHERE` même quand l'identifiant
            // suffit : une conversion ne peut alors pas déborder sur un voisin.
            await q.execute(
                `UPDATE ${cell.table} SET ${cell.column} = CASE ${cell.idColumn} ${cases} END
                  WHERE ${cell.idColumn} IN (${ids}) AND ${ownerFilter(cell)}`,
                [...batch.flatMap((p) => [p.id, p.value]), ...batch.map((p) => p.id), ownerId]
            );
        }
    }
    return pending.length;
}

export {
    countItemTreeRows,
    exportItemTree,
    importItemTree,
    itemTierOf,
    itemTreeProblem,
    movableCellsOf
} from './copy';
export type {
    ItemTier,
    ItemTree,
    ItemTreeDestination,
    ItemTreeRow,
    ItemTreeRows,
    ItemTreeTable
} from './copy';

export { accountExportProblem, EXPORT_SECRET_COLUMN, exportTableRows } from './accountExport';
export type {
    FeatureAccountExport,
    SdkAccountExportContext,
    SdkExportFiles,
    SdkExportSkip,
    SdkExportTable,
    SdkExportWriter,
    SdkWorkspaceExportContext
} from './accountExport';

// Le conteneur chiffré des modules qui stockent des fichiers (voir `devb.ts`).
export {
    BLOB_CHUNK_BYTES,
    BLOB_CHUNK_SEALED,
    BLOB_HEADER_LEN,
    BLOB_TAG_LEN,
    BLOB_VERSION_CHUNKED,
    BLOB_VERSION_STREAM,
    createBlobHeader,
    openChunk,
    openSealedRange,
    openSealedStream,
    openStreamDecipher,
    parseBlobHeader,
    sealChunk,
    sealedSize,
    sealStream
} from './devb';
export { contentDisposition, parseByteRange } from './download';
