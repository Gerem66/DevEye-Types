import type { ZodType } from 'zod';
import { resolveExtras, type FeatureManifest } from './manifest';
import type {
    DevEyeFacade,
    FeatureServiceDeps,
    FeatureStore,
    SdkCipher,
    SdkDevice,
    SdkFeatureContext,
    SdkLogger,
    StorageEncryption
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
    notifications: { subject: string; body: string; itemId?: number }[];
    audits: { action: string; description: string }[];
    /** Outbound agent frames, as `{ method, deviceId }` (payloads dropped for brevity). */
    agentRequests: { method: string; deviceId: string }[];
}

function recordingNotify(recorded: RecordedCalls, hasRoute: boolean): DevEyeFacade['notify'] {
    return {
        hasRoute: () => Promise.resolve(hasRoute),
        send(alert, opts) {
            recorded.notifications.push({
                subject: alert.subject,
                body: alert.body,
                itemId: opts?.itemId
            });
            return Promise.resolve(true);
        }
    };
}

function recordingDevices(devices: readonly SdkDevice[]): DevEyeFacade['devices'] {
    return {
        authorize: (id) =>
            Promise.resolve(
                devices.find((d) => d.id === id) ?? { id, name: 'Test device', online: true }
            ),
        list: () => Promise.resolve([...devices]),
        isOnline: (id) => devices.find((d) => d.id === id)?.online ?? true
    };
}

function recordingAgents(recorded: RecordedCalls): DevEyeFacade['agents'] {
    const req = (method: string) => (deviceId: string) => {
        recorded.agentRequests.push({ method, deviceId });
        return true;
    };
    return {
        isOnline: () => true,
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
        publishSyncState: () => undefined
    };
}

export interface TestContext<Repo> extends SdkFeatureContext<Repo> {
    recorded: RecordedCalls;
    store: TestFeatureStore;
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
    /** Devices `deveye.devices` reveals. Default none listed, any id authorized. */
    devices?: readonly SdkDevice[];
    /** Override facade members entirely when the defaults are not enough. */
    deveye?: Partial<DevEyeFacade>;
}

export function createTestContext<Repo = undefined>(
    overrides: TestContextOverrides<Repo> = {}
): TestContext<Repo> {
    const recorded: RecordedCalls = { notifications: [], audits: [], agentRequests: [] };
    const isOwner = overrides.isOwner ?? true;
    const workspaceId = overrides.workspaceId ?? 1;
    const deveye: DevEyeFacade = {
        notify: recordingNotify(recorded, overrides.hasRoute ?? true),
        mail: { listAccounts: () => Promise.resolve([]) },
        members: {
            list: () =>
                Promise.resolve([{ userId: overrides.userId ?? 1, name: 'Test', isOwner: true }])
        },
        devices: recordingDevices(overrides.devices ?? []),
        agents: recordingAgents(recorded),
        ...overrides.deveye
    };
    return {
        recorded,
        userId: overrides.userId ?? 1,
        workspaceId,
        workspace: { id: workspaceId, kind: overrides.kind ?? 'personal', name: 'Test' },
        isOwner,
        canWrite: overrides.canWrite ?? true,
        ...resolveExtras(overrides.manifest?.extraPermissions, isOwner, overrides.extras ?? {}),
        repo: overrides.repo as Repo,
        store: memoryStore(),
        cipher: () => identityCipher,
        deveye,
        transport: {
            subscribeSync: () => undefined,
            unsubscribeSync: () => undefined,
            sendSyncChunk: () => 0,
            syncChunkBuffered: () => 0
        },
        audit: (entry) => {
            recorded.audits.push({ action: entry.action, description: entry.description });
        },
        logger: silentLogger,
        requestId: 'test'
    };
}

export interface RecordedServiceCalls extends RecordedCalls {
    /** Every `createTicker` call, so a test drives ticks by hand: `await tickers[0].tick()`. */
    tickers: { intervalMs: number; tick(): Promise<void> }[];
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
        audits: [],
        agentRequests: [],
        tickers: []
    };
    const stores = new Map<number, TestFeatureStore>();
    const sealedBytes = new Map<string, Uint8Array>();
    const notify = recordingNotify(recorded, overrides.hasRoute ?? true);
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
            openBytes: (sealed) => sealedBytes.get(sealed) ?? null
        },
        createTicker({ intervalMs, tick }) {
            recorded.tickers.push({ intervalMs, tick });
            return { start: () => undefined, stop: () => undefined };
        },
        logger: silentLogger
    };
}
