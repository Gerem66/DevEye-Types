/**
 * Dotted-numeric version helpers shared by the server (offers/pushes an agent
 * self-update) and the web client (shows the affordance), so both agree on what
 * "newer" means: a self-update is only ever an upgrade, never a downgrade.
 *
 * Non-numeric and missing segments count as 0, so `1.2` equals `1.2.0`. No
 * pre-release handling: DevEye versions are plain dotted integers.
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
