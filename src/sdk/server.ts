import type { z, ZodType } from 'zod';
import type { ErrorCode } from '../protocol/error';
import type { FeatureAccess } from '../domain/workspaceRole';
import type { LogLevelName } from '../domain/logs';

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
 * Native features, reachable only if declared in `manifest.nativeCapabilities`.
 * An undeclared call throws `forbidden`.
 */
export interface DevEyeFacade {
    /** Requires capability `'notify'`. Uses the channels/routes the workspace configured for YOUR feature. */
    notify: {
        /** Is at least one usable channel routed to this target? */
        hasRoute(itemId?: number): Promise<boolean>;
        /** Delivers to the configured channels. Resolves `true` if at least one accepted. */
        send(
            alert: { subject: string; body: string; payload?: Record<string, unknown> },
            opts?: { itemId?: number }
        ): Promise<boolean>;
    };
    /** Requires capability `'mail.accounts'`. Open-tier accounts, metadata only, never credentials. */
    mail: {
        listAccounts(): Promise<
            ReadonlyArray<{ id: number; label: string; address: string | null }>
        >;
    };
    /** Requires capability `'members.read'`. */
    members: {
        list(): Promise<ReadonlyArray<{ userId: number; name: string; isOwner: boolean }>>;
    };
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
    /** Fire-and-forget audit line; actor, IP and workspace are pre-bound. */
    audit(entry: {
        action: string;
        description: string;
        level?: LogLevelName;
        metadata?: Record<string, unknown> | null;
    }): void;
    logger: SdkLogger;
    requestId: string;
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
    /** This command changes data other members can see. */
    mutates?: boolean;
    handler(ctx: SdkFeatureContext<Repo>, input: z.output<I>): Promise<z.input<O>>;
}

/** Identity helper for type inference, mirroring the native `defineFeature`. */
export function defineSdkFeature<Repo, Cmd extends string, I extends ZodType, O extends ZodType>(
    def: SdkFeatureDefinition<Repo, Cmd, I, O>
): SdkFeatureDefinition<Repo, Cmd, I, O> {
    return def;
}

/** A background worker. Started after boot, stopped on shutdown. */
export interface FeatureService {
    start(): void;
    stop(): void | Promise<void>;
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
}
