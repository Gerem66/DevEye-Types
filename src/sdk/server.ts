import type { z, ZodType } from 'zod';
import type { ErrorCode } from '../protocol/error';
import type { FeatureAccess } from '../domain/workspaceRole';
import type { LogLevelName } from '../domain/logs';
import type { ItemAccess } from '../domain/sharing';
import type { AuthWindow, DeviceReport, IntegrityReport, ReportProcess } from '../domain/report';
import type { MetricSnapshot } from '../domain/metrics';
import type { UserColor } from '../domain/user';
import type {
    AgentSyncAckPayload,
    AgentSyncApplyChunkPayload,
    AgentSyncApplyDirPayload,
    AgentSyncApplyLocalPayload,
    AgentSyncApplyStartPayload,
    AgentSyncChangedPayload,
    AgentSyncChunkPayload,
    AgentSyncConfigPayload,
    AgentSyncDeletePayload,
    AgentSyncIndexPayload,
    AgentSyncMovePayload,
    AgentSyncOpResultPayload,
    AgentSyncPushPayload,
    AgentSyncScanPayload,
    AgentFilesMutatePayload,
    AgentFilesUploadPayload,
    CloudSyncChunkPush,
    CloudSyncProgressPush,
    CloudSyncStatePush
} from '../protocol/agent';

/**
 * Server-side SDK surface: what a feature module's handlers and background
 * service are given, and nothing else.
 *
 * This is a deliberate subset of the app's internal context. A module never
 * sees the full repo bundle, raw ciphers, or other features' data; it reaches
 * native features only through the declared {@link DevEyeFacade}.
 */

/** Structural subset of the app logger (pino-compatible). */
export interface SdkLogger {
    debug(obj: unknown, msg?: string): void;
    info(obj: unknown, msg?: string): void;
    warn(obj: unknown, msg?: string): void;
    error(obj: unknown, msg?: string): void;
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
         * same news twice.
         */
        send(
            alert: SdkAlert,
            opts?: { itemId?: number; except?: readonly number[] }
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
         * Throws `not_found` unless the device exists AND belongs to this
         * workspace (a global administrator passes the membership check).
         */
        authorize(deviceId: string): Promise<SdkDevice>;
        /**
         * The devices this workspace sees: its own, or the whole fleet for a
         * global administrator in their PERSONAL workspace (the app's own rule
         * for its device list: that is where an admin watches their machines).
         */
        list(): Promise<readonly SdkDevice[]>;
        isOnline(deviceId: string): boolean;
    };
    /** Requires capability `'telemetry.read'` (native-id modules only). */
    telemetry: SdkTelemetry;
    /** Requires capability `'agents'`. Same object as the service deps' `agents`. */
    agents: AgentsFacade;
}

/**
 * The agent-fleet sync transport (capability `'agents'`, native-id modules
 * only). Method names and semantics mirror the app's MonitorHub exactly, so a
 * repatriated engine swaps its hub handle for this facade and changes nothing
 * else. Outbound calls return `false` when the agent is offline (frame
 * dropped, never queued).
 */
export interface AgentsFacade {
    isOnline(deviceId: string): boolean;
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
    requestSyncConfig(deviceId: string, payload: AgentSyncConfigPayload): boolean;
    requestSyncScan(deviceId: string, payload: AgentSyncScanPayload): boolean;
    requestSyncPush(deviceId: string, payload: AgentSyncPushPayload): boolean;
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
     * Bytes queued on the agent's socket, not yet on the wire. A sender that
     * streams towards an agent must watch it: the socket accepts everything,
     * and without backpressure the server's memory follows the size of what
     * is sent.
     */
    buffered(deviceId: string): number;
}

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
 * Inbound agent events, dispatched by the app's agent socket layer to the
 * modules that declare `'agents'`. Every hook is optional; an absent hook is a
 * no-op. Hooks may fire before your service's `start()` has completed: drop
 * quietly in that case, the agent will resend or reconcile.
 */
export interface FeatureAgentHooks {
    onAgentConnect?(deviceId: string): void | Promise<void>;
    onAgentOffline?(deviceId: string): void;
    /**
     * Telemetry, once the app has persisted it. Only for ACTIVE devices (an
     * unapproved or revoked agent is acknowledged but never recorded, and never
     * reaches a module). Whether the device is watched by YOUR feature is your
     * decision: the app no longer gates telemetry on any feature's settings.
     */
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
    onSyncOpResult?(deviceId: string, payload: AgentSyncOpResultPayload): void;
}

/**
 * The named contracts the host holds (`sdk/providers.ts`): what the installed
 * modules offer on their services. Looked up at call time, `undefined` when
 * nobody offers the key, and it is the caller's job to degrade cleanly (a
 * missing source kind, a run that fails with a clean message). A reader
 * cannot tell who offers a key, on purpose: a contract can change hands (the
 * app offered `PROJECTS_USAGE_PROVIDER` while Projects was native) without
 * anything changing here.
 */
export interface SdkProviders {
    get<T>(key: string): T | undefined;
}

/**
 * Raw bytes under the SERVER key (the `Encryption.encryptWithKey` wire format,
 * byte-compatible with what native code wrote). For wrapping module-owned key
 * material; never for user data, which goes through ciphers and the store.
 */
export interface SdkServerKeys {
    sealBytes(plain: Uint8Array): string;
    /** null when the sealed blob cannot be opened (tampered, or server keys changed). */
    openBytes(sealed: string): Uint8Array | null;
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
    /** `active` is the only status whose telemetry the app records. */
    status: string;
    /** The account that enrolled the device (the actor of its audit lines). */
    ownerUserId: number;
    /** The workspace the device was paired in, or null once that workspace is gone. */
    workspaceId: number | null;
    /** The agent's metric cadence in seconds, null when it follows the default. */
    metricIntervalSeconds: number | null;
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
     * hidden, `'read'` read-only. Restrictive only: it can lower what the
     * feature grants, never raise it. Empty for the owner and for a member
     * without a role. Listings filter with it.
     */
    restrictions(): Promise<ReadonlyMap<number, ItemAccess>>;
    /**
     * Throws `forbidden` unless THIS item is open to the caller at `level`
     * (default `'read'`), role restriction included. Commands that target one
     * item call it first.
     */
    assert(itemId: number, level?: FeatureAccess): Promise<void>;
    /**
     * The item no longer exists: drops its projections, its role restrictions
     * and its notification route. Call it from your delete handler; nothing
     * links those rows to your table (the item lives in a different table per
     * feature), so without this call the next item to inherit the id would
     * inherit them too.
     */
    forget(itemId: number): Promise<void>;
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
    readonly foreignIds: ReadonlySet<number>;
    /** The home workspace of a projected item, or null when it is at home. */
    homeOf(itemId: number): number | null;
    /** The open cipher of the workspace the item lives in (the active one when it is at home). */
    cipherFor(itemId: number): Promise<SdkCipher>;
}

/** Cross-workspace projection of your items (manifest `shareTier` other than `'never'`). */
export interface SdkSharing {
    /**
     * Loads what is projected into the active workspace. Once per listing or
     * read command; the result does not outlive the command.
     */
    scope(): Promise<SdkShareScope>;
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
}

/** The whole fleet, sessionless (capability `'devices.read'`), for services. */
export interface SdkFleetDevices {
    /** One device by id, whatever its workspace, or null. */
    find(deviceId: string): Promise<SdkDevice | null>;
    isOnline(deviceId: string): boolean;
}

/** What a handler receives. One request, one workspace, rights pre-resolved. */
export interface SdkFeatureContext<Repo = unknown> {
    userId: number;
    workspaceId: number;
    workspace: { id: number; kind: 'personal' | 'shared'; name: string };
    isOwner: boolean;
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
    /** Projections into the active workspace. Throws `forbidden` when the manifest says `shareTier: 'never'`. */
    sharing: SdkSharing;
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
    /** The server key derivations, the same `keys` a service gets. */
    keys: SdkServerKeys;
    /**
     * Where DevEye lives, as URLs without a trailing slash: `app` is the
     * origin members use (`PUBLIC_ORIGIN`), `public` the one reachable
     * without the VPN when the host has a public surface (else the same).
     * For what a module hands to the outside world (an install snippet, a
     * callback URL): never derive it from the browser's location.
     */
    origins: { app: string; public: string };
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
     * `level` defaults to `'read'`; `extras` are ALL required. Your feature id
     * is implied: you cannot gate on another feature's rights.
     */
    access?: { level?: FeatureAccess; extras?: readonly string[] };
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

/**
 * A background worker. Started during boot (awaited, before the agent socket
 * layer registers), stopped on shutdown.
 */
/** The request a public route sees: headers, decoded body, client address. Nothing of a session. */
export interface SdkPublicRequest {
    headers: Readonly<Record<string, string | string[] | undefined>>;
    /** The JSON body, already decoded (`undefined` when absent or unreadable). */
    body: unknown;
    /**
     * The query string, decoded by the host into an object (`?a=1&b=2` reads
     * `{ a: '1', b: '2' }`). `unknown` like `body`: read it through a schema.
     * What a ticketed GET (a download URL, an OAuth callback) carries.
     */
    query?: unknown;
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
 * Where a module declares its public routes (capability `'routes.public'`).
 * Paths are absolute (`/t.js`, `/api/t/b`); a path the host already serves
 * is refused at boot. Every route is registered on every public listener.
 */
export interface SdkPublicApp {
    get(path: string, opts: SdkPublicRouteOptions, handler: SdkPublicHandler): void;
    post(path: string, opts: SdkPublicRouteOptions, handler: SdkPublicHandler): void;
}

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
    /** The whole fleet by id, sessionless (capability `'devices.read'`). */
    devices: SdkFleetDevices;
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
    /** Raw key wrapping under the server key, and derived keys. */
    keys: SdkServerKeys;
    /** Redeems a ticket minted by `ctx.secrecy.ticket` of THIS module; `null` when invalid, expired or another module's. */
    secrecy: { redeem(ticket: string): Promise<SdkRedeemedTicket | null> };
    /** Where DevEye lives (the same `origins` a request context gets): for a page or a link a route hands to the browser. */
    origins: { app: string; public: string };
    /** The named contracts the host holds, see `SdkProviders`. */
    providers: SdkProviders;
    /**
     * The app's standard loop: setInterval + reentrancy guard + unref, the
     * exact pattern of every native service. Use it instead of rolling your own.
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
    homeOf(repo: Repo, itemId: number, workspaceId: number): Promise<number | null>;
    /**
     * The item's display name, decrypted with `cipher` (the open cipher of
     * `workspaceId`), or null when the item is gone or unreadable. Names the
     * target a notification route points to; null reads as "a target that
     * disappeared", which is exactly what the screen must show then.
     */
    labelOf(
        repo: Repo,
        cipher: SdkCipher,
        itemId: number,
        workspaceId: number
    ): Promise<string | null>;
}

// Le conteneur chiffré que CloudSync et Backup partagent (voir `devb.ts`).
export {
    BLOB_CHUNK_BYTES,
    BLOB_CHUNK_SEALED,
    BLOB_HEADER_LEN,
    BLOB_TAG_LEN,
    BLOB_VERSION_CHUNKED,
    BLOB_VERSION_STREAM,
    createBlobHeader,
    openChunk,
    openStreamDecipher,
    parseBlobHeader,
    sealChunk
} from './devb';
