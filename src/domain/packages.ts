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

/**
 * Update tooling the agent recognises on a machine but DevEye does not drive:
 * listed without a count, never upgraded, so a device's table says what else
 * keeps it up to date (an atomic image's rpm-ostree, firmware through fwupd…).
 */
export const unmanagedUpdaterIdSchema = z.enum([
    'rpm-ostree',
    'bootc',
    'fwupd',
    'nix',
    'apk',
    'xbps',
    'emerge',
    'eopkg',
    'mas',
    'macports',
    'choco',
    'scoop'
]);

export type UnmanagedUpdaterId = z.infer<typeof unmanagedUpdaterIdSchema>;

/** Whether DevEye drives this tool (counts its updates and applies them). */
export function isManagedPackageManager(
    id: PackageManagerId | UnmanagedUpdaterId
): id is PackageManagerId {
    return packageManagerIdSchema.safeParse(id).success;
}

/**
 * One detected update tool + its pending-update state. An unmanaged one
 * (`unmanagedUpdaterIdSchema`) carries no count and needs nothing.
 */
export const packageManagerSchema = z.object({
    id: z.union([packageManagerIdSchema, unmanagedUpdaterIdSchema]),
    /** Pending update count; `null` when unknown (slow/best-effort probe). */
    pendingCount: z.number().int().nonnegative().nullable(),
    /** Applying this manager's updates requires root/admin. */
    needsRoot: z.boolean(),
    /** A reboot is pending for updates this manager already applied. */
    rebootRequired: z.boolean().default(false)
});

export type PackageManager = z.infer<typeof packageManagerSchema>;
