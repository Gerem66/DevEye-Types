import type { ZodType } from 'zod';
import type {
    DevEyeFacade,
    FeatureStore,
    SdkCipher,
    SdkFeatureContext,
    SdkLogger,
    StorageEncryption
} from './server';

/**
 * Test harness for feature handlers: a fully in-memory {@link SdkFeatureContext}
 * with identity ciphers, a recording facade, and a silent logger. Call your
 * handlers directly from `node:test` files; no app, no database, no socket.
 *
 * ```ts
 * const ctx = createTestContext({ repo: fakeRepo() });
 * const out = await myFeature.features[0].handler(ctx, { name: 'x' });
 * assert.equal(ctx.recorded.notifications.length, 1);
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

function memoryStore(): FeatureStore & {
    rows: Map<string, { value: string; mode: StorageEncryption }>;
} {
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
}

export interface TestContext<Repo> extends SdkFeatureContext<Repo> {
    recorded: RecordedCalls;
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
    /** What `deveye.notify.hasRoute` answers. Default true. */
    hasRoute?: boolean;
    /** Override facade members entirely when the defaults are not enough. */
    deveye?: Partial<DevEyeFacade>;
}

export function createTestContext<Repo = undefined>(
    overrides: TestContextOverrides<Repo> = {}
): TestContext<Repo> {
    const recorded: RecordedCalls = { notifications: [], audits: [] };
    const extras = overrides.extras ?? {};
    const workspaceId = overrides.workspaceId ?? 1;
    const deveye: DevEyeFacade = {
        notify: {
            hasRoute: () => Promise.resolve(overrides.hasRoute ?? true),
            send(alert, opts) {
                recorded.notifications.push({
                    subject: alert.subject,
                    body: alert.body,
                    itemId: opts?.itemId
                });
                return Promise.resolve(true);
            }
        },
        mail: { listAccounts: () => Promise.resolve([]) },
        members: {
            list: () =>
                Promise.resolve([{ userId: overrides.userId ?? 1, name: 'Test', isOwner: true }])
        },
        ...overrides.deveye
    };
    return {
        recorded,
        userId: overrides.userId ?? 1,
        workspaceId,
        workspace: { id: workspaceId, kind: overrides.kind ?? 'personal', name: 'Test' },
        isOwner: overrides.isOwner ?? true,
        canWrite: overrides.canWrite ?? true,
        canExtra: (key) => (overrides.isOwner ?? true) || extras[key] === true,
        extraValue: (key) => {
            const value = extras[key];
            return typeof value === 'string' ? value : '';
        },
        repo: overrides.repo as Repo,
        store: memoryStore(),
        cipher: () => identityCipher,
        deveye,
        audit: (entry) => {
            recorded.audits.push({ action: entry.action, description: entry.description });
        },
        logger: silentLogger,
        requestId: 'test'
    };
}
