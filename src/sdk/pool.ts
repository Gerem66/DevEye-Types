/**
 * Runs `fn` on every item, at most `limit` at once, and resolves in the items'
 * order. A pool, not waves: a slow item holds one slot, never the whole
 * batch, which is what lets a scheduler probe a hundred targets when a few
 * of them hang until their timeout.
 */
export async function mapLimit<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const out = new Array<R>(items.length);
    let next = 0;
    const workers = Array.from(
        { length: Math.min(Math.max(1, Math.floor(limit)), items.length) },
        async () => {
            for (;;) {
                const i = next++;
                if (i >= items.length) return;
                out[i] = await fn(items[i], i);
            }
        }
    );
    await Promise.all(workers);
    return out;
}
