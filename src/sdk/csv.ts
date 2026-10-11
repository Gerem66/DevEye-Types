/**
 * A CSV a spreadsheet opens as a table and never evaluates. The byte order
 * mark makes Excel read UTF-8 as UTF-8; the separator defaults to the one a
 * French Excel expects.
 */
export function toCsv(rows: readonly (readonly string[])[], separator = ';'): string {
    return `\ufeff${rows.map((row) => row.map((cell) => csvCell(cell, separator)).join(separator)).join('\r\n')}`;
}

/**
 * One cell. Quoted when it carries the separator, a quote or a line break;
 * prefixed with an apostrophe when it starts with a formula trigger (`=`, `+`,
 * `-`, `@`, a tab, a carriage return) without being a plain number: quoting
 * alone changes nothing, the spreadsheet strips the quotes before it evaluates.
 * Content that came from a form, a bank statement or a database is someone
 * else's text.
 */
export function csvCell(value: string, separator = ';'): string {
    const formula = /^[=+\-@\t\r]/.test(value) && !/^-?\d+(?:[.,]\d+)?$/.test(value);
    const safe = formula ? `'${value}` : value;
    return safe.includes(separator) || /["\r\n]/.test(safe)
        ? `"${safe.replace(/"/g, '""')}"`
        : safe;
}
