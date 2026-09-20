import { randomUUID } from 'node:crypto';

import { FeatureError, type MovableCell, type SdkCipher, type SdkQueryable } from './server';

/**
 * Copying an item to another workspace, of this DevEye or of another one.
 *
 * You DESCRIBE your item as a tree of tables; the engine below does the rest,
 * once, for every feature: reading the rows, opening the encrypted cells,
 * writing them elsewhere under new ids and another key. A copy between two
 * DevEye instances is the same two halves with the user's browser in between:
 * `exportItemTree` runs on the source server, `importItemTree` on the
 * destination, and the two servers never talk to each other.
 *
 * What travels is PLAINTEXT, by design: the destination seals it under its own
 * key, which the source does not know. It only ever exists in the memory of the
 * two servers and of the browser that carries it.
 */

/** One table of an item's tree, see {@link ItemTree}. */
export interface ItemTreeTable {
    table: string;
    /**
     * Primary key. Never copied: the destination gives the row a new one.
     * Absent on a pure link table (two references and nothing else), which
     * nothing points at and which holds no sealed column.
     */
    idColumn?: string;
    /** `'auto'` (default): AUTO_INCREMENT. `'uuid'`: the engine draws a fresh UUID. */
    idKind?: 'auto' | 'uuid';
    /** Column tying the row to the item. On the root table, the same as `idColumn`. */
    ownerColumn: string;
    /**
     * For a row hanging off the item INDIRECTLY: a SQL subquery selecting the
     * `ownerColumn` values that belong to it, taking the item's id as its only
     * `?`. Interpolated into the query, so a literal written in your module,
     * exactly like `table`. Never build it from input.
     */
    ownerScope?: string;
    /**
     * Columns of encrypted text: opened with the source key, sealed again with
     * the destination's.
     *
     * ⚠️ Held BY HAND: an encrypted column left out is copied as a blob no key
     * of the destination can open, and moved under the old key, where it becomes
     * unreadable. Nothing can detect it, one encrypted blob being
     * indistinguishable from another. Revisit it whenever you add one.
     */
    sealed?: readonly string[];
    /**
     * Columns pointing at a row of a table of this tree (this one included),
     * by that table's name: rewritten to the ids the destination handed out. A
     * reference to anything OUTSIDE the tree belongs in `omit`.
     */
    refs?: Readonly<Record<string, string>>;
    /** Column holding the workspace id, rewritten to the destination's. */
    workspaceColumn?: string;
    /**
     * Column holding the account the row belongs to, rewritten to whoever makes
     * the copy: the original account may not exist where the copy lands. A user
     * reference that is only informative (an assignee) belongs in `omit`.
     */
    userColumn?: string;
    /**
     * Columns the copy leaves to their default: what means nothing elsewhere (a
     * source of the origin workspace, a folder, a sort order) and what the
     * destination must rebuild by itself (a sync state, a last error).
     */
    omit?: readonly string[];
    /**
     * Rows the destination rebuilds by itself (a cache of commits, a history of
     * checks): moved with the item, never copied.
     */
    cache?: boolean;
    /**
     * ROOT only: the column that orders your items within a workspace. The copy
     * lands at the end of the destination's list, whatever rank it had at home.
     * Needs `workspaceColumn`.
     */
    orderColumn?: string;
    /**
     * ROOT only: the column that makes an item unique within a workspace (the
     * digest of its name, encryption being non-deterministic), and the sentence
     * shown when the destination already holds one. Needs `workspaceColumn`.
     */
    unique?: { column: string; message: string };
    /**
     * ROOT only, for a feature whose items choose their tier: the column that
     * says which key seals the whole tree, and its two values. Without it every
     * item is open.
     */
    tier?: { column: string; open: string | number; private: string | number };
}

/**
 * Which key seals an item: `'open'`, the workspace's, that the server can
 * always use, or `'private'`, the caller's password-derived one (see
 * `StorageEncryption`).
 */
export type ItemTier = 'open' | 'private';

/**
 * An item as a tree of tables: the root first, then every table BEFORE the ones
 * that reference it. The single hand-held description of what an item is made
 * of, for the two gestures that need it: `copy` reads it whole, and `move`
 * derives its cells from it ({@link movableCellsOf}).
 */
export type ItemTree = readonly ItemTreeTable[];

/** The cells a `move` re-seals: every sealed column of the tree, caches included. */
export function movableCellsOf(tree: ItemTree): MovableCell[] {
    return tree.flatMap((t) =>
        (t.sealed ?? []).map((column) => ({
            table: t.table,
            // `itemTreeProblem` refuse une table scellée sans identifiant.
            idColumn: t.idColumn ?? '',
            ownerColumn: t.ownerColumn,
            column,
            ...(t.ownerScope ? { ownerScope: t.ownerScope } : {})
        }))
    );
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Why a tree cannot be used, or `null`. The host checks it at boot: every name
 * in it ends up interpolated into SQL, and a table listed before the one it
 * references would be written before the id it needs exists.
 */
export function itemTreeProblem(tree: ItemTree): string | null {
    const [root] = tree;
    if (!root) return 'the tree is empty';
    if (root.ownerColumn !== root.idColumn) {
        return `${root.table}: the root owns itself, ownerColumn must be idColumn`;
    }
    if (root.cache || root.ownerScope) {
        return `${root.table}: the root is neither a cache nor scoped`;
    }
    const seen = new Set<string>();
    for (const t of tree) {
        const names = [
            t.table,
            ...(t.idColumn ? [t.idColumn] : []),
            t.ownerColumn,
            ...(t.workspaceColumn ? [t.workspaceColumn] : []),
            ...(t.userColumn ? [t.userColumn] : []),
            ...(t.orderColumn ? [t.orderColumn] : []),
            ...(t.unique ? [t.unique.column] : []),
            ...(t.tier ? [t.tier.column] : []),
            ...(t.sealed ?? []),
            ...(t.omit ?? []),
            ...Object.keys(t.refs ?? {})
        ];
        const bad = names.find((n) => !IDENTIFIER.test(n));
        if (bad !== undefined) return `${t.table}: "${bad}" is not a plain SQL identifier`;
        if (seen.has(t.table)) return `${t.table}: listed twice`;
        if (t.tier && t !== root) return `${t.table}: only the root chooses the tier`;
        if ((t.orderColumn || t.unique) && (t !== root || !t.workspaceColumn)) {
            return `${t.table}: orderColumn and unique are for a root that names its workspaceColumn`;
        }
        if (
            !t.idColumn &&
            (t === root ||
                (t.sealed ?? []).length > 0 ||
                Object.values(t.refs ?? {}).includes(t.table))
        ) {
            return `${t.table}: only a pure link table goes without idColumn`;
        }
        for (const [column, target] of Object.entries(t.refs ?? {})) {
            if (target !== t.table && !seen.has(target)) {
                return `${t.table}.${column}: references ${target}, which must be listed before it`;
            }
        }
        if (t.ownerScope && t.refs?.[t.ownerColumn] === undefined && !t.cache) {
            return `${t.table}: a scoped table must declare what ${t.ownerColumn} references`;
        }
        seen.add(t.table);
    }
    return null;
}

/** A row as it travels: column name to a JSON-safe value. */
export type ItemTreeRow = Record<string, unknown>;

/** The rows of an item, per table name. Sealed cells are in the clear. */
export type ItemTreeRows = Record<string, ItemTreeRow[]>;

/** How a value that JSON cannot carry travels. */
const BINARY_TAG = '$deveye:base64';

function ownerFilter(t: ItemTreeTable): string {
    return t.ownerScope ? `${t.ownerColumn} IN (${t.ownerScope})` : `${t.ownerColumn} = ?`;
}

/** The writable columns of a table, as the database knows them: generated ones are not. */
async function writableColumns(q: SdkQueryable, table: string): Promise<Set<string>> {
    const rows = await q.query<{ Field: string; Extra: string }>(`SHOW COLUMNS FROM ${table}`);
    // `DEFAULT_GENERATED` n'est qu'une valeur par défaut calculée : la colonne s'écrit.
    return new Set(
        rows.filter((r) => !/(VIRTUAL|STORED) GENERATED/i.test(r.Extra ?? '')).map((r) => r.Field)
    );
}

/** MySQL wants `YYYY-MM-DD HH:MM:SS`, not the ISO form JSON would give a `Date`. */
function toWire(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString().slice(0, 19).replace('T', ' ');
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Uint8Array) return { [BINARY_TAG]: Buffer.from(value).toString('base64') };
    return value;
}

function fromWire(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    const binary = (value as Record<string, unknown>)[BINARY_TAG];
    if (typeof binary === 'string') return Buffer.from(binary, 'base64');
    // A JSON column, parsed by the driver on the way out.
    return JSON.stringify(value);
}

/** The tier of an item still in the database; `null` when it is gone. */
export async function itemTierOf(
    q: SdkQueryable,
    tree: ItemTree,
    itemId: string | number
): Promise<ItemTier | null> {
    const root = tree[0];
    const rows = await q.query<Record<string, unknown>>(
        `SELECT ${root.tier ? root.tier.column : root.idColumn} AS tier FROM ${root.table} WHERE ${root.idColumn} = ?`,
        [itemId]
    );
    if (rows.length === 0) return null;
    return root.tier && String(rows[0].tier) === String(root.tier.private) ? 'private' : 'open';
}

/**
 * Reads an item out of the database, sealed cells opened with `cipher`: the
 * one of the item's tier ({@link itemTierOf}).
 *
 * Throws before returning anything if one cell resists: a copy missing a cell
 * would look whole, and nobody would know what it lost.
 */
export async function exportItemTree(
    q: SdkQueryable,
    tree: ItemTree,
    itemId: string | number,
    cipher: SdkCipher
): Promise<ItemTreeRows> {
    const out: ItemTreeRows = {};
    for (const t of tree) {
        if (t.cache) continue;
        const columns = await writableColumns(q, t.table);
        const skipped = new Set(t.omit ?? []);
        if (t.workspaceColumn) skipped.add(t.workspaceColumn);
        if (t.userColumn) skipped.add(t.userColumn);
        if (t.orderColumn) skipped.add(t.orderColumn);
        // The destination decides the tier: it may not have the private one.
        if (t.tier) skipped.add(t.tier.column);
        const sealed = new Set(t.sealed ?? []);
        const rows = await q.query<ItemTreeRow>(
            `SELECT * FROM ${t.table} WHERE ${ownerFilter(t)}${t.idColumn ? ` ORDER BY ${t.idColumn} ASC` : ''}`,
            [itemId]
        );
        out[t.table] = [];
        for (const row of rows) {
            const copy: ItemTreeRow = {};
            for (const [column, value] of Object.entries(row)) {
                if (!columns.has(column) || skipped.has(column)) continue;
                if (sealed.has(column) && typeof value === 'string' && value !== '') {
                    const plain = await cipher.tryDecrypt(value);
                    if (plain === null) {
                        throw new FeatureError(
                            'internal',
                            `Une ligne de ${t.table} est illisible : copie annulée, rien n’a été écrit.`
                        );
                    }
                    copy[column] = plain;
                } else copy[column] = toWire(value);
            }
            out[t.table].push(copy);
        }
    }
    return out;
}

/** How many rows a bundle holds, for a progress bar or a refusal. */
export function countItemTreeRows(rows: ItemTreeRows): number {
    return Object.values(rows).reduce((n, list) => n + list.length, 0);
}

/** Where a copy lands, and as whom. */
export interface ItemTreeDestination {
    workspaceId: number;
    /** Whoever makes the copy: the account every `userColumn` is rewritten to. */
    userId: number;
    /** The cipher of `tier` in that workspace. */
    cipher: SdkCipher;
    /** Defaults to `'open'`. The root's tier column says so. */
    tier?: ItemTier;
}

/**
 * Writes an item into `into.workspaceId`, sealed cells under `into.cipher`, and
 * returns the id of its new root row. `q` MUST be transactional: a tree written
 * halfway is an item that opens on missing pieces.
 *
 * `rows` comes from a browser, possibly from another DevEye: it is validated
 * against the tree and against the database, never trusted. Table names are
 * taken from the tree alone, column names must exist in the table, and every
 * value is bound.
 */
export async function importItemTree(
    q: SdkQueryable,
    tree: ItemTree,
    rows: ItemTreeRows,
    into: ItemTreeDestination
): Promise<string> {
    const { workspaceId: toWorkspaceId, cipher, tier = 'open' } = into;
    const copied = tree.filter((t) => !t.cache);
    const known = new Set(copied.map((t) => t.table));
    for (const table of Object.keys(rows)) {
        if (!known.has(table)) {
            throw new FeatureError('validation', `Table inattendue dans la copie : ${table}.`);
        }
    }
    const root = copied[0];
    if (!root || (rows[root.table] ?? []).length !== 1) {
        throw new FeatureError('validation', 'La copie doit porter exactement un élément.');
    }

    /** Old id to new id, per table. */
    const ids = new Map<string, Map<string, string | number>>();
    /** A row pointing at its own table: set once every row of that table has its new id. */
    const selfRefs: { t: ItemTreeTable; newId: string | number; column: string; oldRef: string }[] =
        [];
    const rootOldId = String(rows[root.table][0][root.idColumn!]);

    for (const t of copied) {
        const columns = await writableColumns(q, t.table);
        const sealed = new Set(t.sealed ?? []);
        const refs = t.refs ?? {};
        const mine = new Map<string, string | number>();
        ids.set(t.table, mine);

        for (const row of rows[t.table] ?? []) {
            const values: ItemTreeRow = {};
            const pending: { column: string; oldRef: string }[] = [];
            for (const [column, raw] of Object.entries(row)) {
                if (column === t.idColumn) continue;
                if (
                    !columns.has(column) ||
                    column === t.workspaceColumn ||
                    column === t.userColumn ||
                    column === t.orderColumn ||
                    column === t.tier?.column ||
                    (t.omit ?? []).includes(column)
                ) {
                    throw new FeatureError(
                        'validation',
                        `Colonne inattendue dans la copie : ${t.table}.${column}.`
                    );
                }
                const target = refs[column];
                if (target !== undefined && raw !== null) {
                    if (target === t.table) {
                        pending.push({ column, oldRef: String(raw) });
                        values[column] = null;
                        continue;
                    }
                    const mapped = ids.get(target)?.get(String(raw));
                    if (mapped === undefined) {
                        throw new FeatureError(
                            'validation',
                            `Référence orpheline dans la copie : ${t.table}.${column}.`
                        );
                    }
                    values[column] = mapped;
                } else if (sealed.has(column) && typeof raw === 'string' && raw !== '') {
                    values[column] = await cipher.encrypt(raw);
                } else values[column] = fromWire(raw);
            }
            if (t.workspaceColumn) values[t.workspaceColumn] = toWorkspaceId;
            if (t.userColumn) values[t.userColumn] = into.userId;
            if (t.unique && t.workspaceColumn) {
                const taken = await q.query<{ n: number }>(
                    `SELECT COUNT(*) AS n FROM ${t.table} WHERE ${t.workspaceColumn} = ? AND ${t.unique.column} = ?`,
                    [toWorkspaceId, values[t.unique.column] ?? null]
                );
                if (Number(taken[0]?.n ?? 0) > 0) {
                    throw new FeatureError('conflict', t.unique.message);
                }
            }
            if (t.orderColumn && t.workspaceColumn) {
                const last = await q.query<{ next: number }>(
                    `SELECT COALESCE(MAX(${t.orderColumn}) + 1, 0) AS next FROM ${t.table} WHERE ${t.workspaceColumn} = ?`,
                    [toWorkspaceId]
                );
                values[t.orderColumn] = Number(last[0]?.next ?? 0);
            }
            if (t.tier) values[t.tier.column] = t.tier[tier];
            // Whatever the row said, it hangs off the COPY: left as it came, it
            // would attach itself to the original, or to a stranger's item.
            if (t !== root && refs[t.ownerColumn] === undefined) {
                values[t.ownerColumn] = ids.get(root.table)!.get(rootOldId);
            }
            if (t.idColumn && t.idKind === 'uuid') values[t.idColumn] = randomUUID();

            const names = Object.keys(values);
            const res = await q.execute(
                `INSERT INTO ${t.table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
                names.map((n) => values[n])
            );
            if (!t.idColumn) continue;
            const newId = t.idKind === 'uuid' ? (values[t.idColumn] as string) : res.insertId;
            mine.set(String(row[t.idColumn]), newId);
            for (const { column, oldRef } of pending) selfRefs.push({ t, newId, column, oldRef });
        }
    }

    for (const ref of selfRefs) {
        const mapped = ids.get(ref.t.table)?.get(ref.oldRef);
        if (mapped === undefined) {
            throw new FeatureError(
                'validation',
                `Référence orpheline dans la copie : ${ref.t.table}.${ref.column}.`
            );
        }
        await q.execute(
            `UPDATE ${ref.t.table} SET ${ref.column} = ? WHERE ${ref.t.idColumn!} = ?`,
            [mapped, ref.newId]
        );
    }

    return String(ids.get(root.table)!.get(rootOldId));
}
