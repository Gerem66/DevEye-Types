import type { SdkCipher, SdkLogger, SdkQueryable, SdkServerKeys } from './server';

/**
 * The holder's data export (GDPR portability): a zip streamed to their browser,
 * never stored. Everything in it is PLAINTEXT, private tier included: the holder
 * typed their password for it. What never goes in: what opens a service or
 * protects the account (tokens, API keys, integration passwords, secret URLs,
 * hashes, key material).
 *
 * The host exports your `FeatureStore` itself, minus `store.omit`, and every
 * table you declare as an {@link SdkExportTable}. Your hooks write the rest:
 * files, or a table whose rows need shaping.
 */
export interface FeatureAccountExport<Repo = unknown> {
    /**
     * Every table your feature owns, and its fate: exported by the host, by
     * your hooks (`'custom'`), or left out with the sentence the holder reads
     * in the archive. Checked at boot against the tables that exist, and
     * against their columns (see {@link SdkExportTable.omit}).
     */
    tables: Readonly<Record<string, SdkExportTable | 'custom' | SdkExportSkip>>;
    /** Keys of your `FeatureStore` never exported (a token, an API key). The host exports the rest. */
    store?: { omit: readonly string[] };
    /** The large files you carry, measured for the dialog; `optional` ones the holder may leave out. */
    files?: Readonly<Record<string, SdkExportFiles<Repo>>>;
    /** Once per export: what you keep by account rather than by workspace. */
    account?(ctx: SdkAccountExportContext<Repo>): Promise<void>;
    /** Once per workspace the export covers: the personal one and the shared ones the holder owns. */
    workspace?(ctx: SdkWorkspaceExportContext<Repo>): Promise<void>;
}

/** Left out on purpose; `skip` is the sentence the holder reads in the archive, in French. */
export interface SdkExportSkip {
    skip: string;
}

/** A table the host writes for you, paged, sealed cells opened. */
export interface SdkExportTable {
    /** File within your folder, ending in `.json`. */
    file: string;
    /** `'workspace'` (default): the `?` of `where` is the workspace id. `'account'`: the holder's user id. */
    scope?: 'workspace' | 'account';
    /** Selects the rows, with exactly one `?`. A literal of your module, never built from input. */
    where: string;
    /** A unique ordering key, for keyset paging. */
    key: readonly [string, ...string[]];
    /**
     * Encrypted columns, opened whatever their tier. One ending in `_enc` is
     * written without the suffix (`query_enc` as `query`), unless the row
     * already has a column of that name.
     */
    sealed?: readonly string[];
    /** Columns (sealed or not) holding JSON: written as values, not strings. */
    json?: readonly string[];
    /** Epoch columns, written as ISO 8601. */
    dates?: Readonly<Record<string, 's' | 'ms'>>;
    /** Never written. A column named like a secret MUST be here unless listed in `keep`. */
    omit?: readonly string[];
    /** Columns the secret-name rule would drop that are not secrets (`dedup_hash`). */
    keep?: readonly string[];
}

/** Large files your hooks write, measured before the export so the holder knows what to expect. */
export interface SdkExportFiles<Repo = unknown> {
    /** As the dialog names them, in French: `'les fichiers CloudSync'`. */
    label: string;
    /** The holder may leave them out of the archive. */
    optional?: boolean;
    /** Bytes over the holder's owned workspaces; 0 hides them from the dialog. */
    bytes(ctx: {
        repo: Repo;
        q: SdkQueryable;
        userId: number;
        workspaceIds: readonly number[];
    }): Promise<number>;
}

/** Where your hooks write, rooted at your folder in the archive. Paths are made safe by the host. */
export interface SdkExportWriter {
    /** A small JSON document. */
    json(path: string, value: unknown): Promise<void>;
    /** Rows as a JSON array, written as they come. Writes nothing when there is none. */
    rows(path: string, rows: AsyncIterable<unknown>): Promise<void>;
    /** One of your tables, as a declared {@link SdkExportTable} would be written. */
    table(table: string, spec: SdkExportTable): Promise<void>;
    /**
     * A file, streamed. `compress: false` for bytes already compressed (an
     * archive, an image). `mtime` in epoch seconds.
     */
    file(
        path: string,
        bytes: Uint8Array | AsyncIterable<Uint8Array>,
        opts?: { mtime?: number; compress?: boolean }
    ): Promise<void>;
}

interface SdkExportContextBase<Repo> {
    repo: Repo;
    /** Reads only. */
    q: SdkQueryable;
    /** The holder. */
    userId: number;
    out: SdkExportWriter;
    /** Whether the holder kept `files[key]` in the archive. */
    includes(filesKey: string): boolean;
    keys: SdkServerKeys;
    /** Aborted when the download stops: check it in long loops. */
    signal: AbortSignal;
    logger: SdkLogger;
}

export interface SdkAccountExportContext<Repo = unknown> extends SdkExportContextBase<Repo> {
    /** Every workspace the export covers. */
    workspaceIds: readonly number[];
}

export interface SdkWorkspaceExportContext<Repo = unknown> extends SdkExportContextBase<Repo> {
    workspace: { id: number; kind: 'personal' | 'shared'; name: string };
    /** Both tiers are readable for the length of this export. */
    cipher(mode?: 'server' | 'private'): SdkCipher;
    /** A sealed cell opened whatever its tier; `null` (and counted in the report) when no key opens it. */
    open(blob: string): Promise<string | null>;
}

/** A column name that looks like a secret: {@link SdkExportTable.omit} it, or `keep` it knowingly. */
export const EXPORT_SECRET_COLUMN = /(secret|token|passw|_hash$|private_key|credential|wrapped)/i;

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** What is wrong with a declaration, or `null`. Checked at boot, before any table is read. */
export function accountExportProblem(entry: FeatureAccountExport<unknown>): string | null {
    const files = new Map<string, string>();
    for (const [table, fate] of Object.entries(entry.tables)) {
        if (!IDENTIFIER.test(table)) return `table « ${table} »: not an identifier`;
        if (fate === 'custom') continue;
        if ('skip' in fate) {
            if (!fate.skip.trim()) return `table « ${table} »: a skip says why`;
            continue;
        }
        if (!/^[a-z0-9][a-z0-9-]*\.json$/.test(fate.file)) {
            return `table « ${table} »: file « ${fate.file} »`;
        }
        const scoped = `${fate.scope ?? 'workspace'}:${fate.file}`;
        const other = files.get(scoped);
        if (other) return `tables « ${other} » and « ${table} » write the same file`;
        files.set(scoped, table);
        if ((fate.where.match(/\?/g) ?? []).length !== 1) {
            return `table « ${table} »: where takes exactly one ?`;
        }
        if (fate.where.includes(';')) return `table « ${table} »: where holds a ;`;
        const columns = [
            ...fate.key,
            ...(fate.sealed ?? []),
            ...(fate.json ?? []),
            ...Object.keys(fate.dates ?? {}),
            ...(fate.omit ?? []),
            ...(fate.keep ?? [])
        ];
        const bad = columns.find((column) => !IDENTIFIER.test(column));
        if (bad) return `table « ${table} »: column « ${bad} »`;
        const omitted = new Set(fate.omit ?? []);
        const clash = (fate.sealed ?? []).find((column) => omitted.has(column));
        if (clash) return `table « ${table} »: « ${clash} » is both sealed and omitted`;
    }
    if (entry.store && entry.store.omit.some((key) => !key.trim())) {
        return 'store.omit holds an empty key';
    }
    return null;
}

const MIN_PAGE = 10;
const MAX_PAGE = 1000;
/** A page aims at this many bytes: a table of data-URL images must not load a thousand of them at once. */
const PAGE_BYTES = 4 * 1024 * 1024;

/** A cell as JSON can carry it: dates to ISO 8601, large integers to strings, bytes to base64. */
function plainCell(value: unknown): unknown {
    if (typeof value === 'bigint') {
        return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString();
    }
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Uint8Array) return { base64: Buffer.from(value).toString('base64') };
    return value;
}

function isoOf(value: unknown, unit: 's' | 'ms'): unknown {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return value;
    return new Date(unit === 's' ? n * 1000 : n).toISOString();
}

/**
 * The rows of one declared table, oldest key first, one page at a time: the
 * page size follows the bytes read, so a table of large cells never loads
 * whole. Omitted columns never leave this function; sealed ones are opened by
 * `open`, a `null` there meaning no key opens the cell (`onUnreadable` counts
 * it).
 */
export async function* exportTableRows(
    q: SdkQueryable,
    table: string,
    spec: SdkExportTable,
    scopeId: number,
    open: (blob: string) => Promise<string | null>,
    onUnreadable: () => void = () => undefined
): AsyncGenerator<Record<string, unknown>> {
    const omitted = new Set(spec.omit ?? []);
    const sealed = new Set(spec.sealed ?? []);
    const json = new Set(spec.json ?? []);
    const dates = spec.dates ?? {};
    const order = spec.key.map((column) => `\`${column}\``).join(', ');
    let size = 200;
    let last: unknown[] | null = null;
    for (;;) {
        const after: string =
            last === null ? '' : ` AND (${order}) > (${spec.key.map(() => '?').join(', ')})`;
        const rows: Record<string, unknown>[] = await q.query<Record<string, unknown>>(
            `SELECT * FROM \`${table}\` WHERE (${spec.where})${after} ORDER BY ${order} LIMIT ${size}`,
            [scopeId, ...(last ?? [])]
        );
        let bytes = 0;
        for (const row of rows) {
            const out: Record<string, unknown> = {};
            for (const [column, raw] of Object.entries(row)) {
                if (omitted.has(column)) continue;
                let value: unknown = raw;
                if (sealed.has(column) && typeof raw === 'string' && raw !== '') {
                    value = await open(raw);
                    if (value === null) onUnreadable();
                }
                if (json.has(column) && typeof value === 'string') {
                    try {
                        value = JSON.parse(value);
                    } catch {
                        // Un JSON qui ne se relit pas reste tel quel : la donnée prime sur sa forme.
                    }
                }
                if (column in dates) value = isoOf(value, dates[column]);
                const plain =
                    sealed.has(column) && column.endsWith('_enc') ? column.slice(0, -4) : column;
                out[plain !== column && !(plain in row) ? plain : column] = plainCell(value);
            }
            bytes += JSON.stringify(out).length;
            yield out;
        }
        if (rows.length < size) return;
        last = spec.key.map((column) => rows[rows.length - 1][column]);
        size = Math.min(
            MAX_PAGE,
            Math.max(MIN_PAGE, Math.round((size * PAGE_BYTES) / Math.max(1, bytes)))
        );
    }
}
