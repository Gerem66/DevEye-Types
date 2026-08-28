import type { ZodType } from 'zod';
import type { ItemAccess } from '../domain/sharing';
import { resolveExtras, type FeatureManifest } from './manifest';
import {
    FeatureError,
    type DevEyeFacade,
    type FeatureServiceDeps,
    type FeatureStore,
    type SdkCipher,
    type SdkDevice,
    type SdkFeatureContext,
    type SdkLogger,
    type SdkProviders,
    type SdkTelemetry,
    type SdkTelemetrySnapshot,
    type StorageEncryption
} from './server';

/**
 * Test harnesses: a fully in-memory {@link SdkFeatureContext} for handlers and
 * a matching {@link FeatureServiceDeps} for background services, with
 * identity ciphers, a recording facade, and a silent logger. Call your code
 * directly from `node:test` files; no app, no database, no socket.
 *
 * ```ts
 * const ctx = createTestContext({ repo: fakeRepo(), manifest });
 * const out = await myFeature.features[0].handler(ctx, { name: 'x' });
 * assert.equal(ctx.recorded.notifications.length, 1);
 *
 * const deps = createTestServiceDeps({ repo: fakeRepo() });
 * const service = myServer.createService(deps);
 * await deps.recorded.tickers[0].tick();
 * ```
 */

const identityCipher: SdkCipher = {
    encrypt: (plaintext) => Promise.resolve(plaintext),
    decrypt: (blob) => Promise.resolve(blob),
    tryDecrypt: (blob) => Promise.resolve(blob)
};

/**
 * The guarded cipher of a SEALED session, as the app's behaves: `encrypt` and
 * `decrypt` throw `locked`, `tryDecrypt` answers null (a listing that
 * degrades gracefully). Handed out for `'private'` when the harness says
 * `unlocked: false`, so a test covers both the guard a handler puts before
 * reading and the refusal the cipher itself opposes.
 */
const sealedCipher: SdkCipher = {
    encrypt: () => Promise.reject(new FeatureError('locked', 'Password encryption is locked')),
    decrypt: () => Promise.reject(new FeatureError('locked', 'Password encryption is locked')),
    tryDecrypt: () => Promise.resolve(null)
};

const silentLogger: SdkLogger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined
};

/** The in-memory store, with its rows exposed so tests can assert on modes. */
export interface TestFeatureStore extends FeatureStore {
    rows: Map<string, { value: string; mode: StorageEncryption }>;
}

function memoryStore(): TestFeatureStore {
    const rows = new Map<string, { value: string; mode: StorageEncryption }>();
    return {
        rows,
        put(key, value, opts) {
            rows.set(key, { value, mode: opts?.encryption ?? 'server' });
            return Promise.resolve();
        },
        putJson<T>(
            key: string,
            _schema: ZodType<T>,
            value: T,
            opts?: { encryption?: StorageEncryption }
        ) {
            rows.set(key, { value: JSON.stringify(value), mode: opts?.encryption ?? 'server' });
            return Promise.resolve();
        },
        get: (key) => Promise.resolve(rows.get(key)?.value ?? null),
        getJson<T>(key: string, schema: ZodType<T>) {
            const row = rows.get(key);
            return Promise.resolve(row ? schema.parse(JSON.parse(row.value)) : null);
        },
        remove(key) {
            rows.delete(key);
            return Promise.resolve();
        },
        keys: (prefix) =>
            Promise.resolve([...rows.keys()].filter((k) => !prefix || k.startsWith(prefix)))
    };
}

export interface RecordedCalls {
    notifications: {
        subject: string;
        body: string;
        itemId?: number;
        embeds?: number;
        except?: readonly number[];
    }[];
    /** Live messages posted (`messageId: null`) or edited through `notify.postLive`. */
    liveMessages: { channelId: number; messageId: string | null; embeds?: number }[];
    audits: { action: string; description: string }[];
    /** Outbound agent frames, as `{ method, deviceId }` (payloads dropped for brevity). */
    agentRequests: { method: string; deviceId: string }[];
    /** Instants pinned through `telemetry.pinInstant`. */
    pinnedInstants: { deviceId: string; ts: number }[];
}

function recordingNotify(
    recorded: RecordedCalls,
    hasRoute: boolean,
    accepted: boolean,
    liveChannels: readonly number[]
): DevEyeFacade['notify'] {
    let posted = 0;
    return {
        hasRoute: () => Promise.resolve(hasRoute),
        send(alert, opts) {
            recorded.notifications.push({
                subject: alert.subject,
                body: alert.body,
                itemId: opts?.itemId,
                // Only when the alert carries a layout: a test that
                // deep-equals the plain record must not see the key appear.
                ...(alert.embeds ? { embeds: alert.embeds.length } : {}),
                ...(opts?.except ? { except: opts.except } : {})
            });
            // Recorded either way (the module did try), but a refused delivery
            // answers false, so a test sees what the module does with it.
            return Promise.resolve(accepted);
        },
        liveChannels: () => Promise.resolve(liveChannels.map((id) => ({ id }))),
        postLive(channelId, message, messageId) {
            recorded.liveMessages.push({
                channelId,
                messageId: messageId ?? null,
                ...(message.embeds ? { embeds: message.embeds.length } : {})
            });
            // A post mints an id (`live-1`, `live-2`...), an edit keeps the
            // one it was given; a refusing host answers null either way.
            if (!accepted) return Promise.resolve(null);
            return Promise.resolve(messageId ?? `live-${++posted}`);
        }
    };
}

/** A device the harness invents for an id nothing listed: active, online, unreported. */
export function testDevice(over: Partial<SdkDevice> & { id: string }): SdkDevice {
    return {
        name: 'Test device',
        online: true,
        status: 'active',
        ownerUserId: 1,
        workspaceId: 1,
        metricIntervalSeconds: null,
        report: null,
        ...over
    };
}

function recordingDevices(devices: readonly SdkDevice[]): DevEyeFacade['devices'] {
    return {
        authorize: (id) => Promise.resolve(devices.find((d) => d.id === id) ?? testDevice({ id })),
        list: () => Promise.resolve([...devices]),
        isOnline: (id) => devices.find((d) => d.id === id)?.online ?? true
    };
}

function recordingTelemetry(
    recorded: RecordedCalls,
    snapshots: readonly SdkTelemetrySnapshot[]
): SdkTelemetry {
    return {
        snapshot: (_deviceId, ts) =>
            Promise.resolve(snapshots.find((s) => Math.abs(s.ts - ts) <= 1000) ?? null),
        pinInstant(deviceId, ts) {
            recorded.pinnedInstants.push({ deviceId, ts });
            return Promise.resolve();
        }
    };
}

function recordingAgents(recorded: RecordedCalls): DevEyeFacade['agents'] {
    const req = (method: string) => (deviceId: string) => {
        recorded.agentRequests.push({ method, deviceId });
        return true;
    };
    return {
        isOnline: () => true,
        requestScan: req('requestScan'),
        pushConfig: (deviceId) => Promise.resolve(req('pushConfig')(deviceId)),
        requestSyncConfig: req('requestSyncConfig'),
        requestSyncScan: req('requestSyncScan'),
        requestSyncPush: req('requestSyncPush'),
        requestSyncApplyChunk: req('requestSyncApplyChunk'),
        requestSyncApplyStart: req('requestSyncApplyStart'),
        requestSyncApplyDir: req('requestSyncApplyDir'),
        requestSyncApplyLocal: req('requestSyncApplyLocal'),
        requestSyncMove: req('requestSyncMove'),
        requestSyncDelete: req('requestSyncDelete'),
        publishSyncProgress: () => undefined,
        publishSyncState: () => undefined,
        requestFilesMutate: req('requestFilesMutate'),
        requestFilesUpload: req('requestFilesUpload'),
        // Every file order succeeds at once: a test of what a module does
        // with a refusal injects its own facade through `deveye`.
        awaitFilesOp: () => Promise.resolve({ ok: true }),
        cancelFilesOp: () => undefined,
        buffered: () => 0
    };
}

/**
 * A deterministic stand-in for `keys.derive`: the same (salt, info) yields
 * the same bytes, distinct pairs distinct bytes, and nothing here is secret.
 */
function fakeDerive(salt: string, info: string, length: number): Uint8Array {
    const out = new Uint8Array(length);
    const seed = `${salt}|${info}`;
    for (let i = 0; i < length; i += 1) {
        out[i] = (seed.charCodeAt(i % seed.length) * (i + 1)) & 0xff;
    }
    return out;
}

/** The named contracts a test hands to the module (`providers` override). */
function fakeProviders(table: Readonly<Record<string, unknown>>): SdkProviders {
    return { get: <T>(key: string) => table[key] as T | undefined };
}

export interface TestContext<Repo> extends SdkFeatureContext<Repo> {
    recorded: RecordedCalls;
    store: TestFeatureStore;
    /** Item ids passed to `items.forget`, in order. */
    forgotten: number[];
}

export interface TestContextOverrides<Repo> {
    repo?: Repo;
    userId?: number;
    workspaceId?: number;
    kind?: 'personal' | 'shared';
    isOwner?: boolean;
    canWrite?: boolean;
    /** Extra permissions the caller holds, as the grant would carry them. */
    extras?: Record<string, boolean | string>;
    /**
     * Your manifest: `canExtra` / `extraValue` then follow the exact runtime
     * rules ({@link resolveExtras}). Without it no extra is declared, so
     * every key answers `false` / `''`, owner or not.
     */
    manifest?: Pick<FeatureManifest, 'extraPermissions'>;
    /** What `deveye.notify.hasRoute` answers. Default true. */
    hasRoute?: boolean;
    /** What `deveye.notify.send` resolves (no usable channel: false). Default true; recorded either way. */
    notifyAccepted?: boolean;
    /** What `ctx.origins` answers. Default `https://deveye.test` / `https://public.deveye.test`. */
    origins?: { app: string; public: string };
    /** The channel ids `deveye.notify.liveChannels` lists. Default none. */
    liveChannels?: readonly number[];
    /** Devices `deveye.devices` reveals. Default none listed, any id authorized. */
    devices?: readonly SdkDevice[];
    /** Instants `deveye.telemetry.snapshot` answers (matched within a second). Default none. */
    snapshots?: readonly SdkTelemetrySnapshot[];
    /** Override facade members entirely when the defaults are not enough. */
    deveye?: Partial<DevEyeFacade>;
    /**
     * What `secrecy.isUnlocked` answers. Default true. When false, the
     * `'private'` cipher is sealed too (`decrypt` throws `locked`,
     * `tryDecrypt` answers null), exactly like the app's guarded tier in a
     * locked session; the `'server'` cipher stays the identity.
     */
    unlocked?: boolean;
    /** The caller's role restrictions on items, by item id. Default none. */
    itemRestrictions?: Readonly<Record<number, ItemAccess>>;
    /**
     * Items projected INTO the workspace, as `itemId → home workspace id`.
     * Default none: every item is at home. `sharing.scope().cipherFor` is the
     * identity cipher either way.
     */
    shares?: Readonly<Record<number, number>>;
    /** The named contracts the host holds (`ctx.providers.get(key)`). */
    providers?: Readonly<Record<string, unknown>>;
}

export function createTestContext<Repo = undefined>(
    overrides: TestContextOverrides<Repo> = {}
): TestContext<Repo> {
    const recorded: RecordedCalls = {
        notifications: [],
        liveMessages: [],
        audits: [],
        agentRequests: [],
        pinnedInstants: []
    };
    const isOwner = overrides.isOwner ?? true;
    const workspaceId = overrides.workspaceId ?? 1;
    const canWrite = overrides.canWrite ?? true;
    const deveye: DevEyeFacade = {
        notify: recordingNotify(
            recorded,
            overrides.hasRoute ?? true,
            overrides.notifyAccepted ?? true,
            overrides.liveChannels ?? []
        ),
        mail: { listAccounts: () => Promise.resolve([]) },
        members: {
            list: () =>
                Promise.resolve([
                    { userId: overrides.userId ?? 1, name: 'Test', isOwner: true, color: null }
                ])
        },
        devices: recordingDevices(overrides.devices ?? []),
        telemetry: recordingTelemetry(recorded, overrides.snapshots ?? []),
        agents: recordingAgents(recorded),
        ...overrides.deveye
    };
    const restrictions = new Map<number, ItemAccess>(
        Object.entries(overrides.itemRestrictions ?? {}).map(([id, access]) => [Number(id), access])
    );
    const homes = new Map<number, number>(
        Object.entries(overrides.shares ?? {}).map(([id, home]) => [Number(id), home])
    );
    const forgotten: number[] = [];
    return {
        recorded,
        forgotten,
        secrecy: { isUnlocked: () => Promise.resolve(overrides.unlocked ?? true) },
        items: {
            restrictions: () => Promise.resolve(restrictions),
            // The exact rule of the app's dispatcher: the feature first (a
            // restriction can only lower), then the row.
            assert(itemId, level = 'read') {
                if (level === 'write' && !canWrite) {
                    return Promise.reject(new FeatureError('forbidden', 'write required'));
                }
                const restriction = restrictions.get(itemId);
                if (restriction === 'none') {
                    return Promise.reject(new FeatureError('forbidden', 'item hidden'));
                }
                if (restriction === 'read' && level === 'write') {
                    return Promise.reject(new FeatureError('forbidden', 'item read-only'));
                }
                return Promise.resolve();
            },
            forget(itemId) {
                forgotten.push(itemId);
                return Promise.resolve();
            }
        },
        sharing: {
            scope: () =>
                Promise.resolve({
                    foreignIds: new Set(homes.keys()),
                    homeOf: (itemId) => homes.get(itemId) ?? null,
                    cipherFor: () => Promise.resolve(identityCipher)
                })
        },
        userId: overrides.userId ?? 1,
        workspaceId,
        workspace: { id: workspaceId, kind: overrides.kind ?? 'personal', name: 'Test' },
        isOwner,
        canWrite: overrides.canWrite ?? true,
        ...resolveExtras(overrides.manifest?.extraPermissions, isOwner, overrides.extras ?? {}),
        repo: overrides.repo as Repo,
        store: memoryStore(),
        cipher: (mode) =>
            mode === 'private' && overrides.unlocked === false ? sealedCipher : identityCipher,
        deveye,
        transport: {
            subscribeSync: () => undefined,
            unsubscribeSync: () => undefined,
            sendSyncChunk: () => 0,
            syncChunkBuffered: () => 0
        },
        providers: fakeProviders(overrides.providers ?? {}),
        audit: (entry) => {
            recorded.audits.push({ action: entry.action, description: entry.description });
        },
        logger: silentLogger,
        requestId: 'test',
        origins: overrides.origins ?? {
            app: 'https://deveye.test',
            public: 'https://public.deveye.test'
        }
    };
}

export interface RecordedServiceCalls extends RecordedCalls {
    /** Every `createTicker` call, so a test drives ticks by hand: `await tickers[0].tick()`. */
    tickers: { intervalMs: number; tick(): Promise<void> }[];
    /** Workspaces passed to `live.changed`, in order. */
    liveChanges: number[];
}

export interface TestServiceDeps<Repo> extends FeatureServiceDeps<Repo> {
    recorded: RecordedServiceCalls;
    /** One in-memory store per workspace touched, keyed by workspace id. */
    stores: Map<number, TestFeatureStore>;
}

export interface TestServiceOverrides<Repo> {
    repo?: Repo;
    /** What `listWorkspaceIds` answers. Default `[1]`. */
    workspaceIds?: readonly number[];
    /** Devices every workspace reveals. Default none. */
    devices?: readonly SdkDevice[];
    /** What `deveyeFor(...).notify.hasRoute` answers. Default true. */
    hasRoute?: boolean;
    /** What `deveyeFor(...).notify.send` resolves. Default true; recorded either way. */
    notifyAccepted?: boolean;
    /** The channel ids `deveyeFor(...).notify.liveChannels` lists. Default none. */
    liveChannels?: readonly number[];
    /** Instants `telemetry.snapshot` answers (matched within a second). Default none. */
    snapshots?: readonly SdkTelemetrySnapshot[];
    /** The named contracts the host holds (`deps.providers.get(key)`). */
    providers?: Readonly<Record<string, unknown>>;
}

/**
 * The service twin of {@link createTestContext}: sessionless, so no guarded
 * cipher and no `'private'` rows, exactly like the app. Tickers never start on
 * their own; the test calls `recorded.tickers[i].tick()` when it wants a beat.
 */
export function createTestServiceDeps<Repo = undefined>(
    overrides: TestServiceOverrides<Repo> = {}
): TestServiceDeps<Repo> {
    const recorded: RecordedServiceCalls = {
        notifications: [],
        liveMessages: [],
        audits: [],
        agentRequests: [],
        pinnedInstants: [],
        tickers: [],
        liveChanges: []
    };
    const stores = new Map<number, TestFeatureStore>();
    const sealedBytes = new Map<string, Uint8Array>();
    const notify = recordingNotify(
        recorded,
        overrides.hasRoute ?? true,
        overrides.notifyAccepted ?? true,
        overrides.liveChannels ?? []
    );
    const devices = recordingDevices(overrides.devices ?? []);
    return {
        recorded,
        stores,
        repo: overrides.repo as Repo,
        listWorkspaceIds: () => Promise.resolve([...(overrides.workspaceIds ?? [1])]),
        storeFor(workspaceId) {
            let store = stores.get(workspaceId);
            if (!store) {
                store = memoryStore();
                stores.set(workspaceId, store);
            }
            return store;
        },
        cipherFor: () => identityCipher,
        deveyeFor: () => ({ notify }),
        devicesFor: () => ({ list: devices.list, isOnline: devices.isOnline }),
        devices: {
            find: (id) =>
                Promise.resolve((overrides.devices ?? []).find((d) => d.id === id) ?? null),
            isOnline: devices.isOnline
        },
        telemetry: recordingTelemetry(recorded, overrides.snapshots ?? []),
        live: {
            changed(workspaceId) {
                recorded.liveChanges.push(workspaceId);
            }
        },
        audit: (entry) => {
            recorded.audits.push({ action: entry.action, description: entry.description });
        },
        agents: recordingAgents(recorded),
        // A fake wrapper: the sealed string is a handle to the bytes, and an
        // unknown handle opens to `null` exactly like a tampered blob would.
        keys: {
            sealBytes(plain) {
                const handle = `sealed:${sealedBytes.size}`;
                sealedBytes.set(handle, Uint8Array.from(plain));
                return handle;
            },
            openBytes: (sealed) => sealedBytes.get(sealed) ?? null,
            derive: fakeDerive
        },
        providers: fakeProviders(overrides.providers ?? {}),
        createTicker({ intervalMs, tick }) {
            recorded.tickers.push({ intervalMs, tick });
            return { start: () => undefined, stop: () => undefined };
        },
        logger: silentLogger
    };
}
