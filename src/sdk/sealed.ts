import type { FeatureServer } from './server';

/**
 * A column whose cells you seal with `keys.sealBytes`, declared in
 * {@link FeatureServer.sealed}. When the server key (`CRYPT_KEY_A` /
 * `CRYPT_KEY_B`) changes, the host re-wraps every declared cell, and it refuses
 * to boot on a cell left in an outdated format. A sealed column you leave out
 * turns unreadable at the first rotation.
 */
export interface FeatureSealedColumn {
    table: string;
    column: string;
    /** The column that identifies a row on its own: the rotation rewrites the cell by it. */
    id: string;
    /** Only the rows whose columns hold these values, when the table mixes sealed cells with others. */
    match?: Readonly<Record<string, string>>;
    /** The `context` you pass to `sealBytes` for the row `id`; leave it out when you pass none. */
    context?: (id: string | number) => string;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * What is wrong with your sealed columns, or `null`. Checked at boot: every
 * name ends up in SQL, and a table must be one of yours, as
 * `accountExport.tables` lists them.
 */
export function sealedColumnsProblem(
    server: Pick<FeatureServer, 'sealed' | 'accountExport'>
): string | null {
    const owned = new Set(Object.keys(server.accountExport?.tables ?? {}));
    const seen = new Set<string>();
    for (const sealed of server.sealed ?? []) {
        const names = [sealed.table, sealed.column, sealed.id, ...Object.keys(sealed.match ?? {})];
        const bad = names.find((name) => !IDENTIFIER.test(name));
        if (bad !== undefined) return `sealed: « ${bad} » is not an identifier`;
        if (!owned.has(sealed.table)) {
            return `sealed: ${sealed.table} is not in accountExport.tables`;
        }
        const cell = `${sealed.table}.${sealed.column}`;
        if (seen.has(cell)) return `sealed: ${cell} declared twice`;
        seen.add(cell);
    }
    return null;
}
