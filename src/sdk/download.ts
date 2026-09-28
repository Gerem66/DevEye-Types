/**
 * Serving a stored file over HTTP: the two headers every download route
 * writes, the same way everywhere.
 */

/**
 * `Content-Disposition` for a name that came from a user. The plain
 * `filename=` form is reduced to safe ASCII (a newline, which Node rejects
 * outright, would turn the download into a 500); the real name rides in the
 * RFC 5987 `filename*` form, which browsers prefer when both are present.
 * `inline` only for types that cannot run script on your origin.
 */
export function contentDisposition(
    filename: string,
    disposition: 'attachment' | 'inline' = 'attachment'
): string {
    const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
    const fallback = ascii.trim() || 'fichier';
    return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Reads a `Range` request header against a body of `size` bytes (RFC 9110
 * §14.1.2). One range only: `null` means serve the whole body with a 200 (no
 * header, a malformed one, or several ranges, which a server may ignore);
 * `'unsatisfiable'` calls for a 416 whose `Content-Range` states the size
 * after an asterisk. The range is inclusive, as `SdkObjectStore.get` takes it.
 */
export function parseByteRange(
    header: string | undefined,
    size: number
): { start: number; end: number } | 'unsatisfiable' | null {
    if (header === undefined) return null;
    const match = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(header);
    if (!match) return null;
    const [, first, last] = match;
    if (first === '' && last === '') return null;
    if (first === '') {
        const suffix = Number(last);
        if (suffix === 0 || size === 0) return 'unsatisfiable';
        return { start: Math.max(0, size - suffix), end: size - 1 };
    }
    const start = Number(first);
    const end = last === '' ? size - 1 : Math.min(Number(last), size - 1);
    if (last !== '' && Number(last) < start) return null;
    if (start >= size) return 'unsatisfiable';
    return { start, end };
}
