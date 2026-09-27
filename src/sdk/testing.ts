import type { ZodType } from 'zod';
import type { ItemAccess } from '../domain/sharing';
import type { PathExclusion } from '../domain/pathExclusions';
import { normaliseDomainHost } from './domains';
import { resolveExtras, type FeatureManifest } from './manifest';
import {
    FeatureError,
    type AgentFolderArchive,
    type AgentFolderArchiveSummary,
    type DevEyeFacade,
    type FeatureDomainsContext,
    type SdkDns,
    type SdkDomain,
    type FeatureServiceDeps,
    type FeatureStore,
    type SdkAccount,
    type SdkCipher,
    type SdkDevice,
    type SdkFeatureContext,
    type SdkLogger,
    type SdkOrigins,
    type SdkPlanPauses,
    type SdkProviders,
    type SdkTelemetry,
    type SdkTelemetrySnapshot,
    type StorageEncryption,
    SdkWorkspaceSummary
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
 * The guarded cipher of a SEALED session: `encrypt` and `decrypt` throw
 * `locked`, `tryDecrypt` answers null. Handed out for `'private'` when the
 * harness says `unlocked: false`.
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
    /** Folder archives asked through `agents.archiveFolder`, with what they cover. */
    archiveRequests: {
        deviceId: string;
        path: string;
        exclusions: readonly PathExclusion[];
        oneFileSystem: boolean;
    }[];
    /** Instants pinned through `telemetry.pinInstant`. */
    pinnedInstants: { deviceId: string; ts: number }[];
    /** Frames pushed through `live.publish`, in order. */
    livePublishes: { workspaceId: number; event: string; payload: unknown }[];
    /** Accounts beaten through `live.accountChanged`, in order. */
    accountChanges: number[];
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

function recordingDevices(
    devices: readonly SdkDevice[],
    refuseExtras: boolean | readonly string[] = false
): DevEyeFacade['devices'] {
    const refused = (id: string): boolean =>
        refuseExtras === true || (Array.isArray(refuseExtras) && refuseExtras.includes(id));
    return {
        authorize: (id, options) =>
            refused(id) && (options?.extras?.length ?? 0) > 0
                ? Promise.reject(
                      new FeatureError(
                          'forbidden',
                          'Cette permission ne vous est pas accordée sur cet élément'
                      )
                  )
                : Promise.resolve(devices.find((d) => d.id === id) ?? testDevice({ id })),
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

/** What a test says of a folder archive: its pieces, or the error its stream throws. */
export interface TestFolderArchive {
    chunks: readonly Buffer[];
    summary?: Partial<AgentFolderArchiveSummary>;
}

/** What a test says of its devices' agents: a deployment's verdict, an inventory, folder archives. */
interface TestAgents {
    dockerRun?: DevEyeFacade['agents']['dockerRun'];
    dockerInventory?: DevEyeFacade['agents']['dockerInventory'];
    /** By device id. A device without an entry answers nothing: its stream throws. */
    archives?: Readonly<Record<string, TestFolderArchive | Error>>;
}

/** Replays the planned pieces; the summary appears once the last one is taken, as in the app. */
function replayedArchive(planned: TestFolderArchive | Error | undefined): AgentFolderArchive {
    let summary: AgentFolderArchiveSummary | null = null;
    return {
        get summary() {
            return summary;
        },
        async *[Symbol.asyncIterator]() {
            if (!planned) throw new Error('No archive planned for this device');
            if (planned instanceof Error) throw planned;
            let bytesRead = 0;
            for (const chunk of planned.chunks) {
                bytesRead += chunk.length;
                yield chunk;
            }
            summary = {
                files: 1,
                dirs: 0,
                bytesRead,
                skipped: 0,
                changed: 0,
                samples: [],
                ...planned.summary
            };
        }
    };
}

function recordingAgents(recorded: RecordedCalls, docker: TestAgents = {}): DevEyeFacade['agents'] {
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
        requestDestroy: req('requestDestroy'),
        disconnectAgent: req('disconnectAgent'),
        // Nothing synced: a test of the self-update flag feeds a manifest to
        // the module's own pure helper.
        servedManifest: () => Promise.resolve(null),
        requestFilesMutate: req('requestFilesMutate'),
        requestFilesUpload: req('requestFilesUpload'),
        // Every file order succeeds at once: a test of what a module does
        // with a refusal injects its own facade through `deveye`.
        awaitFilesOp: () => Promise.resolve({ ok: true }),
        cancelFilesOp: () => undefined,
        buffered: () => 0,
        // Recorded, then answered as the test decides: success, and no
        // inventory, by default.
        dockerRun: (deviceId, order, options) => {
            recorded.agentRequests.push({ method: 'dockerRun', deviceId });
            return docker.dockerRun
                ? docker.dockerRun(deviceId, order, options)
                : Promise.resolve({ ok: true });
        },
        dockerInventory: (deviceId, timeoutMs) =>
            docker.dockerInventory
                ? docker.dockerInventory(deviceId, timeoutMs)
                : Promise.resolve(null),
        archiveFolder(deviceId, request) {
            recorded.agentRequests.push({ method: 'archiveFolder', deviceId });
            recorded.archiveRequests.push({ deviceId, ...request });
            return replayedArchive(docker.archives?.[deviceId]);
        }
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

/** The plan pauses, from a fixed list by YOUR quota key: no key is checked against the manifest. */
function memoryPauses(
    pausedItems: Readonly<Record<string, readonly string[]>> | undefined
): SdkPlanPauses {
    return {
        isPaused: (key, itemId) => (pausedItems?.[key] ?? []).includes(itemId),
        paused: (key) => pausedItems?.[key] ?? []
    };
}

/** The app's refusal of a paused item run on demand. */
async function assertActiveIn(pauses: SdkPlanPauses, key: string, itemId: string): Promise<void> {
    if (pauses.isPaused(key, itemId)) {
        throw new FeatureError('quota_exceeded', `« ${key} » ${itemId} is paused by the plan`, {
            key,
            paused: true
        });
    }
}

function memoryDomains(domains: readonly SdkDomain[]) {
    return {
        in: (workspaceId: number) => domains.filter((d) => d.workspaceId === workspaceId),
        byHost: (host: string) => domains.find((d) => d.host === normaliseDomainHost(host)) ?? null
    };
}

/** Lookups that find nothing, unless the test says otherwise. */
const emptyDns: SdkDns = {
    txt: () => Promise.resolve([]),
    mx: () => Promise.resolve([]),
    cname: () => Promise.resolve([])
};

/** The named contracts a test hands to the module (`providers` override). */
function fakeProviders(table: Readonly<Record<string, unknown>>): SdkProviders {
    return { get: <T>(key: string) => table[key] as T | undefined };
}

export interface TestContext<Repo> extends SdkFeatureContext<Repo> {
    recorded: RecordedCalls;
    store: TestFeatureStore;
    /** Item ids passed to `items.forget`, in order. */
    forgotten: string[];
}

export interface TestContextOverrides<Repo> {
    repo?: Repo;
    userId?: number;
    workspaceId?: number;
    kind?: 'personal' | 'shared';
    isOwner?: boolean;
    /** Global administrator. Default false. */
    isAdmin?: boolean;
    /** What `deveye.workspaces.list()` answers. Default none. */
    workspaces?: readonly SdkWorkspaceSummary[];
    /** What `deveye.accounts.me()` answers. Default: an account named after `userId`. */
    account?: SdkAccount;
    /** The plan's limits, by YOUR quota key. An absent key is unlimited. Default none. */
    quotaLimits?: Record<string, number>;
    /** The workspaces the owner account owns, handed to a quota counter. Default: the workspace of the call. */
    ownerWorkspaceIds?: readonly number[];
    /** The items the plan holds paused, by YOUR `stock` quota key. Default none. */
    pausedItems?: Record<string, readonly string[]>;
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
    /** What `ctx.origins` answers. Default `https://deveye.test` / `https://public.deveye.test` / `https://site.deveye.test`. */
    origins?: SdkOrigins;
    /** The channel ids `deveye.notify.liveChannels` lists. Default none. */
    liveChannels?: readonly number[];
    /** Devices `deveye.devices` reveals. Default none listed, any id authorized. */
    devices?: readonly SdkDevice[];
    /**
     * `deveye.devices.authorize` refuses any `extras`: the caller lacks them
     * on every device (`true`) or on these ones. Default false.
     */
    refuseDeviceExtras?: boolean | readonly string[];
    /** What `deveye.agents.dockerRun` resolves. Default success. */
    dockerRun?: DevEyeFacade['agents']['dockerRun'];
    /** What `deveye.agents.dockerInventory` resolves. Default null (no answer). */
    dockerInventory?: DevEyeFacade['agents']['dockerInventory'];
    /** What `deveye.agents.archiveFolder` streams, by device id. Default none: the stream throws. */
    archives?: Readonly<Record<string, TestFolderArchive | Error>>;
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
    itemRestrictions?: Readonly<Record<string, ItemAccess>>;
    /**
     * Extra permissions overridden on one item, by item id then key. What
     * `items.canExtra` answers there; elsewhere it follows `extras`.
     */
    itemExtras?: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
    /**
     * Items projected INTO the workspace, as `itemId → home workspace id`.
     * Default none: every item is at home. `sharing.scope().cipherFor` is the
     * identity cipher either way.
     */
    shares?: Readonly<Record<string, number>>;
    /** The feature's domains, every workspace mixed: `ctx.domains` answers for the active one. Default none. */
    domains?: readonly SdkDomain[];
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
        archiveRequests: [],
        pinnedInstants: [],
        livePublishes: [],
        accountChanges: []
    };
    const isOwner = overrides.isOwner ?? true;
    const workspaceId = overrides.workspaceId ?? 1;
    const canWrite = overrides.canWrite ?? true;
    const pauses = memoryPauses(overrides.pausedItems);
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
        workspaces: { list: () => Promise.resolve(overrides.workspaces ?? []) },
        devices: recordingDevices(overrides.devices ?? [], overrides.refuseDeviceExtras ?? false),
        telemetry: recordingTelemetry(recorded, overrides.snapshots ?? []),
        agents: recordingAgents(recorded, overrides),
        accounts: {
            me: () =>
                Promise.resolve(
                    overrides.account ?? {
                        id: overrides.userId ?? 1,
                        email: `user${overrides.userId ?? 1}@deveye.test`,
                        username: `user${overrides.userId ?? 1}`,
                        isAdmin: overrides.isAdmin ?? false,
                        created: 0
                    }
                )
        },
        ...overrides.deveye
    };
    const restrictions = new Map<string, ItemAccess>(
        Object.entries(overrides.itemRestrictions ?? {})
    );
    const extras = resolveExtras(
        overrides.manifest?.extraPermissions,
        isOwner,
        overrides.extras ?? {}
    );
    const homes = new Map<string, number>(Object.entries(overrides.shares ?? {}));
    const forgotten: string[] = [];
    const orders: { itemId: string; order: number }[] = [];
    return {
        recorded,
        forgotten,
        secrecy: {
            isUnlocked: () => Promise.resolve(overrides.unlocked ?? true),
            // Un ticket lisible tel quel : le harnais ne signe rien, il
            // sérialise, et `createTestServiceDeps().secrecy.redeem` relit.
            ticket: (payload) =>
                Promise.resolve(
                    `ticket:${JSON.stringify({ userId: overrides.userId ?? 1, workspaceId, payload, unlocked: overrides.unlocked ?? true })}`
                )
        },
        keys: {
            sealBytes: (plain) => `sealed:${Buffer.from(plain).toString('base64')}`,
            openBytes: () => null,
            derive: fakeDerive
        },
        live: {
            publish(event, payload) {
                recorded.livePublishes.push({ workspaceId, event, payload });
            },
            accountChanged(userId) {
                recorded.accountChanges.push(userId);
            }
        },
        quota: {
            ...pauses,
            limit: (key) => Promise.resolve(overrides.quotaLimits?.[key] ?? null),
            // The exact rule of the app: never counted when unlimited, refused
            // once the count AFTER creation passes the limit.
            async assert(key, countAfter) {
                const limit = overrides.quotaLimits?.[key];
                if (limit === undefined) return;
                const count = await countAfter(overrides.ownerWorkspaceIds ?? [workspaceId]);
                if (count > limit) {
                    throw new FeatureError('quota_exceeded', `quota « ${key} » reached`, {
                        key,
                        limit
                    });
                }
            },
            assertActive: (key, itemId) => assertActiveIn(pauses, key, itemId)
        },
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
            canExtra(itemId, key) {
                return Promise.resolve(
                    overrides.itemExtras?.[itemId]?.[key] ?? extras.canExtra(key)
                );
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
                    cipherFor: () => Promise.resolve(identityCipher),
                    orderOf: (itemId) =>
                        homes.has(itemId)
                            ? (orders.find((o) => o.itemId === itemId)?.order ?? 0)
                            : null
                }),
            setOrder: (itemId, order) => {
                orders.push({ itemId, order });
                return Promise.resolve();
            }
        },
        userId: overrides.userId ?? 1,
        workspaceId,
        workspace: { id: workspaceId, kind: overrides.kind ?? 'personal', name: 'Test' },
        isOwner,
        isAdmin: overrides.isAdmin ?? false,
        canWrite: overrides.canWrite ?? true,
        ...extras,
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
        domains: {
            list: () => Promise.resolve(memoryDomains(overrides.domains ?? []).in(workspaceId)),
            get: (id) =>
                Promise.resolve(
                    memoryDomains(overrides.domains ?? [])
                        .in(workspaceId)
                        .find((d) => d.id === id) ?? null
                ),
            verified: () =>
                Promise.resolve(
                    memoryDomains(overrides.domains ?? [])
                        .in(workspaceId)
                        .filter((d) => d.verified)
                )
        },
        providers: fakeProviders(overrides.providers ?? {}),
        audit: (entry) => {
            recorded.audits.push({ action: entry.action, description: entry.description });
        },
        logger: silentLogger,
        requestId: 'test',
        origins: overrides.origins ?? {
            app: 'https://deveye.test',
            public: 'https://public.deveye.test',
            site: 'https://site.deveye.test'
        }
    };
}

export interface RecordedServiceCalls extends RecordedCalls {
    /** Every `createTicker` call, so a test drives ticks by hand: `await tickers[0].tick()`. */
    tickers: { intervalMs: number; tick(): Promise<void> }[];
    /** Workspaces passed to `live.changed`, in order. */
    liveChanges: number[];
    /** `live.changed` calls that named topics, as `{ workspaceId, topics }` (a bare beat is not listed here). */
    liveTopicChanges: { workspaceId: number; topics: readonly string[] }[];
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
    /** What `membersFor(workspaceId).list()` answers, by workspace id. Default none. */
    members?: Readonly<Record<number, Awaited<ReturnType<DevEyeFacade['members']['list']>>>>;
    /** What `deps.agents.dockerRun` resolves. Default success. */
    dockerRun?: DevEyeFacade['agents']['dockerRun'];
    /** What `deps.agents.dockerInventory` resolves. Default null (no answer). */
    dockerInventory?: DevEyeFacade['agents']['dockerInventory'];
    /** What `deps.agents.archiveFolder` streams, by device id. Default none: the stream throws. */
    archives?: Readonly<Record<string, TestFolderArchive | Error>>;
    /** What `deps.access` answers. Default: every member holds every right. */
    access?: Partial<FeatureServiceDeps['access']>;
    /** The accounts `deps.accounts` knows. Default none. */
    accounts?: readonly SdkAccount[];
    /** The plan's limits `deps.quotaFor` applies, by YOUR quota key. Default none (unlimited). */
    quotaLimits?: Record<string, number>;
    /** The items the plan holds paused (`deps.pauses`), by YOUR `stock` quota key. Default none. */
    pausedItems?: Record<string, readonly string[]>;
    /** What `deveyeFor(...).notify.hasRoute` answers. Default true. */
    hasRoute?: boolean;
    /** What `deveyeFor(...).notify.send` resolves. Default true; recorded either way. */
    notifyAccepted?: boolean;
    /** The channel ids `deveyeFor(...).notify.liveChannels` lists. Default none. */
    liveChannels?: readonly number[];
    /** What `deps.origins` answers. Default `https://deveye.test` / `https://public.deveye.test` / `https://site.deveye.test`. */
    origins?: SdkOrigins;
    /** Instants `telemetry.snapshot` answers (matched within a second). Default none. */
    snapshots?: readonly SdkTelemetrySnapshot[];
    /** The feature's domains, every workspace mixed. Default none. */
    domains?: readonly SdkDomain[];
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
        archiveRequests: [],
        pinnedInstants: [],
        livePublishes: [],
        accountChanges: [],
        tickers: [],
        liveChanges: [],
        liveTopicChanges: []
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
    const pauses = memoryPauses(overrides.pausedItems);
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
        origins: overrides.origins ?? {
            app: 'https://deveye.test',
            public: 'https://public.deveye.test',
            site: 'https://site.deveye.test'
        },
        secrecy: {
            redeem: (ticket) => {
                if (!ticket.startsWith('ticket:')) return Promise.resolve(null);
                const parsed = JSON.parse(ticket.slice('ticket:'.length)) as {
                    userId: number;
                    workspaceId: number;
                    payload: unknown;
                    unlocked: boolean;
                };
                return Promise.resolve({
                    userId: parsed.userId,
                    workspaceId: parsed.workspaceId,
                    payload: parsed.payload,
                    cipher: {
                        server: identityCipher,
                        private: parsed.unlocked ? identityCipher : null
                    }
                });
            }
        },
        devicesFor: () => ({ list: devices.list, isOnline: devices.isOnline }),
        membersFor: (workspaceId) => ({
            list: () => Promise.resolve(overrides.members?.[workspaceId] ?? [])
        }),
        devices: {
            find: (id) =>
                Promise.resolve((overrides.devices ?? []).find((d) => d.id === id) ?? null),
            isOnline: devices.isOnline
        },
        telemetry: recordingTelemetry(recorded, overrides.snapshots ?? []),
        live: {
            changed(workspaceId, topics) {
                recorded.liveChanges.push(workspaceId);
                if (topics) recorded.liveTopicChanges.push({ workspaceId, topics });
            },
            publish(workspaceId, event, payload) {
                recorded.livePublishes.push({ workspaceId, event, payload });
            },
            accountChanged(userId) {
                recorded.accountChanges.push(userId);
            }
        },
        quotaFor: () => ({
            ...pauses,
            limit: (key) => Promise.resolve(overrides.quotaLimits?.[key] ?? null),
            async assert(key, countAfter) {
                const limit = overrides.quotaLimits?.[key];
                if (limit === undefined) return;
                if ((await countAfter(overrides.workspaceIds ?? [1])) > limit) {
                    throw new FeatureError('quota_exceeded', `quota « ${key} » reached`, {
                        key,
                        limit
                    });
                }
            },
            assertActive: (key, itemId) => assertActiveIn(pauses, key, itemId)
        }),
        pauses,
        accounts: {
            find: (userId) =>
                Promise.resolve((overrides.accounts ?? []).find((a) => a.id === userId) ?? null),
            findByEmail: (email) =>
                Promise.resolve(
                    (overrides.accounts ?? []).find(
                        (a) => a.email === email.trim().toLowerCase()
                    ) ?? null
                ),
            list: (userIds) =>
                Promise.resolve((overrides.accounts ?? []).filter((a) => userIds.includes(a.id))),
            search: (query, limit) => {
                const needle = query.trim().toLowerCase();
                const id = /^\d+$/.test(needle) ? Number(needle) : null;
                const found = (overrides.accounts ?? [])
                    .filter(
                        (a) =>
                            needle === '' ||
                            a.id === id ||
                            a.username.toLowerCase().includes(needle) ||
                            a.email.toLowerCase().includes(needle)
                    )
                    .sort(
                        (a, b) =>
                            Number(b.id === id) - Number(a.id === id) ||
                            a.username.localeCompare(b.username)
                    );
                return Promise.resolve(
                    found.slice(0, Math.min(Math.max(1, Math.trunc(limit ?? 20)), 50))
                );
            }
        },
        audit: (entry) => {
            recorded.audits.push({ action: entry.action, description: entry.description });
        },
        agents: recordingAgents(recorded, overrides),
        access: {
            feature: overrides.access?.feature ?? (() => Promise.resolve({ ok: true })),
            device: overrides.access?.device ?? (() => Promise.resolve({ ok: true }))
        },
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
        domains: {
            findByHost: (host) =>
                Promise.resolve(memoryDomains(overrides.domains ?? []).byHost(host)),
            get: (workspaceId, id) =>
                Promise.resolve(
                    memoryDomains(overrides.domains ?? [])
                        .in(workspaceId)
                        .find((d) => d.id === id) ?? null
                ),
            listVerified: (workspaceId) =>
                Promise.resolve(
                    memoryDomains(overrides.domains ?? [])
                        .in(workspaceId)
                        .filter((d) => d.verified)
                )
        },
        providers: fakeProviders(overrides.providers ?? {}),
        createTicker({ intervalMs, tick }) {
            recorded.tickers.push({ intervalMs, tick });
            return { start: () => undefined, stop: () => undefined };
        },
        logger: silentLogger
    };
}

/** A domain row for a test, verified by default. */
export function testDomain(over: Partial<SdkDomain> & { id: number; host: string }): SdkDomain {
    return {
        workspaceId: 1,
        token: 'a'.repeat(32),
        verified: true,
        verifiedAt: 1,
        planPaused: false,
        ...over
    };
}

/**
 * What the `domains` hooks of a server entry receive, in memory: identity
 * cipher, one store per workspace, and lookups that find nothing unless `dns`
 * says otherwise.
 */
export function createTestDomainsContext<Repo = undefined>(
    overrides: {
        repo?: Repo;
        dns?: Partial<SdkDns>;
        origins?: SdkOrigins;
    } = {}
): FeatureDomainsContext<Repo> {
    const stores = new Map<number, TestFeatureStore>();
    const sealedBytes = new Map<string, Uint8Array>();
    return {
        repo: overrides.repo as Repo,
        origins: overrides.origins ?? {
            app: 'https://deveye.test',
            public: 'https://public.deveye.test',
            site: 'https://site.deveye.test'
        },
        cipherFor: () => identityCipher,
        storeFor(workspaceId) {
            let store = stores.get(workspaceId);
            if (!store) {
                store = memoryStore();
                stores.set(workspaceId, store);
            }
            return store;
        },
        keys: {
            sealBytes: (plain) => {
                const handle = `sealed:${sealedBytes.size}`;
                sealedBytes.set(handle, Uint8Array.from(plain));
                return handle;
            },
            openBytes: (sealed) => sealedBytes.get(sealed) ?? null,
            derive: fakeDerive
        },
        dns: { ...emptyDns, ...overrides.dns },
        logger: silentLogger
    };
}
