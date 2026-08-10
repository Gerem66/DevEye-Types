import { z } from 'zod';
import { deviceSchema } from '../domain/device';
import { packageManagerIdSchema } from '../domain/packages';
import { agentLifecycleActionSchema, agentPowerActionSchema } from '../protocol/agent';
import { processCaptureSchema } from '../domain/report';

const deviceId = z.uuid();

/** List devices visible to the caller (own devices; all devices for admins). */
export const deviceList = {
    command: 'device.list' as const,
    input: z.object({
        /**
         * `workspace` (défaut) : les appareils de l'espace actif — ce qu'affichent
         * l'accueil, la topbar et Monitoring.
         * `fleet` : toute la flotte, tous espaces confondus. Réservé aux
         * administrateurs, pour la page Appareils.
         */
        scope: z.enum(['workspace', 'fleet']).optional()
    }),
    output: z.object({ devices: z.array(deviceSchema) })
};

/** Confirm a `pending` device, moving it to `active`. */
export const deviceConfirm = {
    command: 'device.confirm' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/** Revoke a device: its token is rejected and it can no longer push metrics. */
export const deviceRevoke = {
    command: 'device.revoke' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/**
 * Lay out the workspace's devices: `ids` is the **complete** list in its final
 * order (lower index first). New devices are appended, so the order is entirely
 * the user's — as it is for monitored services, repositories and notes.
 *
 * Scoped to the active workspace, and gated on `devices: write` rather than on
 * `admin: true` like the rest of this module: arranging a list one's own
 * workspace displays is not fleet management. Touches no agent state.
 */
export const deviceReorder = {
    command: 'device.reorder' as const,
    input: z.object({ ids: z.array(deviceId).min(1) }),
    output: z.object({ ids: z.array(deviceId) })
};

export const deviceRename = {
    command: 'device.rename' as const,
    input: z.object({ deviceId, name: z.string().min(1).max(128) }),
    output: z.object({ device: deviceSchema })
};

/**
 * Update a device's collection config. Every field is optional; only the
 * provided ones change. `null` resets a field to the server default. Interval
 * or capture changes are pushed live to a connected agent.
 */
export const deviceSetConfig = {
    command: 'device.setConfig' as const,
    input: z
        .object({
            deviceId,
            /** Collection interval in seconds — metrics *and* processes (5s–1h). */
            metricIntervalSeconds: z.number().int().min(5).max(3600).nullable().optional(),
            processCapture: processCaptureSchema.nullable().optional(),
            /** Conservation de l'historique — métriques, présence et processus. */
            retentionDays: z.number().int().positive().max(3650).nullable().optional()
        })
        .refine(
            (v) =>
                v.metricIntervalSeconds !== undefined ||
                v.processCapture !== undefined ||
                v.retentionDays !== undefined,
            { message: 'No config field provided' }
        ),
    output: z.object({ device: deviceSchema })
};

/** Reactivate a revoked device, moving it back to `active`. */
export const deviceReactivate = {
    command: 'device.reactivate' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/**
 * Push a self-update to a connected device's agent: the server resolves the newer
 * signed binary for the device's build target and sends `agent.update`. Admin-only
 * (Appareils page). Fails if the agent is offline, has no known target, the binary
 * is missing/unsigned, or it's already up to date.
 */
export const deviceUpdateAgent = {
    command: 'device.updateAgent' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/**
 * Enable/disable the agent's per-user autostart (survives reboot, no privilege).
 * Pushes `agent.service` to the connected agent (`install-user`/`uninstall-user`).
 */
export const deviceSetAutostart = {
    command: 'device.setAutostart' as const,
    input: z.object({ deviceId, enabled: z.boolean() }),
    output: z.object({ device: deviceSchema })
};

/**
 * Ask the agent to become a root/system service. Hybrid: the agent pops an OS auth
 * prompt if it has an interactive session, else replies `needsManualCommand` and the
 * UI shows `manualCommand` (always returned, deterministic per platform) to run on
 * the device. The new privilege/scope is observed on the agent's next report.
 */
export const deviceElevate = {
    command: 'device.elevate' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema, manualCommand: z.string() })
};

/** Ask a root/system agent to drop back to a per-user service. */
export const deviceDropPrivileges = {
    command: 'device.dropPrivileges' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema, manualCommand: z.string() })
};

/**
 * Ask the agent to enumerate its package managers + pending updates. The result
 * arrives asynchronously as a `package.list` push event (the caller must be
 * subscribed to the device). The command itself only acknowledges the request.
 */
export const deviceListPackages = {
    command: 'device.listPackages' as const,
    input: z.object({ deviceId }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Apply all pending updates of one manager. Progress streams as `package.progress`
 * events, ending with `package.done`. Fails if the agent is offline or the manager
 * needs root and the agent isn't privileged (elevate it first — see device.elevate).
 */
export const deviceUpgradePackages = {
    command: 'device.upgradePackages' as const,
    input: z.object({ deviceId, manager: packageManagerIdSchema }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Run a system power action on the device (shutdown / reboot / suspend / hibernate
 * / lock). Owner-or-admin; the agent must be online. The command only acknowledges
 * the request — the agent applies it best-effort and the outcome streams back as a
 * `device.powerResult` push event (the caller must be subscribed to the device).
 */
export const devicePower = {
    command: 'device.power' as const,
    input: z.object({ deviceId, action: agentPowerActionSchema }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Stop or cleanly restart the agent *process* on the device (not the machine).
 * - `stop`: the agent exits. With autostart (supervised service) the manager
 *   relaunches it within seconds; standalone, the device stays offline — and
 *   unmanageable remotely — until someone relaunches it on the machine.
 * - `restart`: exit-and-relaunch (manager or self-respawn), e.g. to pick up a
 *   clean state.
 * Owner-or-admin; the agent must be online. Fire-and-forget: the command only
 * acknowledges the push — the outcome is observed through presence.
 */
export const deviceAgentLifecycle = {
    command: 'device.agentLifecycle' as const,
    input: z.object({ deviceId, action: agentLifecycleActionSchema }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Request a managed deletion (from the Appareils page). The device moves to
 * `pending_deletion`: on its next connection the agent is told to self-destruct
 * (wipe its local config + binary), after which the device is archived — its
 * monitoring history is kept and stays browsable, but it's gone from management.
 * If the agent is online the destroy signal is sent immediately.
 */
export const deviceRequestDelete = {
    command: 'device.requestDelete' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/** Cancel a `pending_deletion` (only effective while the agent hasn't reconnected). */
export const deviceCancelDelete = {
    command: 'device.cancelDelete' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/**
 * Finalise a deletion immediately: archive the device now without waiting for the
 * agent to self-destruct (use when the agent is gone, or you don't care if it
 * cleans itself up). A still-connected agent is told to self-destruct best-effort,
 * but the device is archived regardless; if it ever reconnects it's refused.
 */
export const deviceForceDelete = {
    command: 'device.forceDelete' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/**
 * Hard-purge a device and ALL its monitoring history (used by the Monitoring
 * page to remove an archived — or any — device and reset its data). Works
 * whether the agent is online or not; it does not self-destruct the agent.
 */
export const deviceDelete = {
    command: 'device.delete' as const,
    input: z.object({ deviceId }),
    output: z.object({ deviceId })
};

export const deviceCommands = [
    deviceList,
    deviceConfirm,
    deviceRevoke,
    deviceReactivate,
    deviceRename,
    deviceReorder,
    deviceSetConfig,
    deviceUpdateAgent,
    deviceSetAutostart,
    deviceElevate,
    deviceDropPrivileges,
    deviceListPackages,
    deviceUpgradePackages,
    devicePower,
    deviceAgentLifecycle,
    deviceRequestDelete,
    deviceCancelDelete,
    deviceForceDelete,
    deviceDelete
] as const;
