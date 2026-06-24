import { z } from 'zod';

/**
 * Update tooling DevEye can detect and drive on a monitored machine. Covers OS
 * package managers and the two heavyweight system updaters (macOS softwareupdate,
 * Windows Update). The agent only reports the ones actually present on the host.
 */
export const packageManagerIdSchema = z.enum([
    'apt',
    'dnf',
    'pacman',
    'pamac',
    'flatpak',
    'snap',
    'zypper',
    'brew',
    'softwareupdate',
    'winget',
    'windowsupdate'
]);

export type PackageManagerId = z.infer<typeof packageManagerIdSchema>;

/** One detected manager + its pending-update state. */
export const packageManagerSchema = z.object({
    id: packageManagerIdSchema,
    /** Pending update count; `null` when unknown (slow/best-effort probe). */
    pendingCount: z.number().int().nonnegative().nullable(),
    /** Applying this manager's updates requires root/admin. */
    needsRoot: z.boolean(),
    /** A reboot is pending for updates this manager already applied. */
    rebootRequired: z.boolean().default(false)
});

export type PackageManager = z.infer<typeof packageManagerSchema>;
