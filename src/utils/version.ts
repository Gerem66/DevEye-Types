/**
 * Dotted-numeric version helpers shared by the server (which decides whether to
 * offer/push an agent self-update) and the web client (which decides whether to
 * show the affordance). Keeping a single implementation here means both ends agree
 * on what "newer" means — a self-update is only ever offered/pushed as an UPGRADE,
 * never a downgrade, even if the served manifest happens to lag a running agent.
 *
 * Non-numeric segments are treated as 0 and missing segments as 0, so `1.2` and
 * `1.2.0` compare equal. No pre-release/build-metadata handling: DevEye versions
 * come from a single `package.json`, so plain dotted integers are enough.
 */

/** Compare dotted numeric versions: <0 if a<b, >0 if a>b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map((p) => parseInt(p, 10) || 0);
    const pb = b.split('.').map((p) => parseInt(p, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

/** Whether `candidate` is strictly newer than `current`. */
export function isNewerVersion(candidate: string, current: string): boolean {
    return compareVersions(candidate, current) > 0;
}
