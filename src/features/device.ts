import { z } from 'zod';
import { deviceSchema } from '../domain/device';
import { processCaptureSchema } from '../domain/report';
import { workspaceKindSchema } from '../domain/workspace';

/**
 * La feature Appareils (pages Appareils et Monitoring) : le cycle de vie d'un
 * appareil, sa configuration de collecte et son partage entre espaces. Tout ce
 * qui relaie un ordre à l'agent lui-même est du transport, dans
 * `features/agent.ts` (`agent.*`) ; l'historique lu en base est dans
 * `features/metrics.ts`, sous le même préfixe `devices.*`.
 */

const deviceId = z.uuid();

/** List devices visible to the caller (own devices; all devices for admins). */
export const devicesList = {
    command: 'devices.list' as const,
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
export const devicesConfirm = {
    command: 'devices.confirm' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/** Revoke a device: its token is rejected and it can no longer push metrics. */
export const devicesRevoke = {
    command: 'devices.revoke' as const,
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
export const devicesReorder = {
    command: 'devices.reorder' as const,
    input: z.object({ ids: z.array(deviceId).min(1) }),
    output: z.object({ ids: z.array(deviceId) })
};

export const devicesRename = {
    command: 'devices.rename' as const,
    input: z.object({ deviceId, name: z.string().min(1).max(128) }),
    output: z.object({ device: deviceSchema })
};

/**
 * Update a device's collection config. Every field is optional; only the
 * provided ones change. `null` resets a field to the server default. Interval
 * or capture changes are pushed live to a connected agent.
 */
export const devicesSetConfig = {
    command: 'devices.setConfig' as const,
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

/** Un espace candidat au partage d'un appareil, tel que l'affiche la popup. */
export const deviceShareTargetSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    kind: workspaceKindSchema,
    /** L'espace a-t-il accès à cet appareil ? */
    shared: z.boolean()
});
export type DeviceShareTarget = z.infer<typeof deviceShareTargetSchema>;

/**
 * Les espaces avec lesquels un appareil peut être partagé, et lesquels le sont.
 *
 * Réservé aux administrateurs : c'est la seule commande qui énumère des espaces
 * dont l'appelant n'est pas membre, et elle n'existe que pour la page Appareils.
 */
export const devicesWorkspaceList = {
    command: 'devices.workspaceList' as const,
    input: z.object({ deviceId }),
    output: z.object({
        /**
         * Espace d'appairage : toujours partagé, jamais retirable. `null` si cet
         * espace a été supprimé depuis — l'appareil n'a alors plus d'origine et
         * tous ses partages sont révocables.
         */
        originWorkspaceId: z.number().int().positive().nullable(),
        workspaces: z.array(deviceShareTargetSchema)
    })
};

/**
 * Fixe l'ensemble des espaces ayant accès à un appareil. La liste est complète :
 * un espace absent perd l'accès. L'espace d'appairage est réintégré d'office.
 */
export const devicesSetWorkspaces = {
    command: 'devices.setWorkspaces' as const,
    input: z.object({
        deviceId,
        workspaceIds: z.array(z.number().int().positive())
    }),
    output: z.object({ device: deviceSchema })
};

/** Reactivate a revoked device, moving it back to `active`. */
export const devicesReactivate = {
    command: 'devices.reactivate' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/**
 * Request a managed deletion (from the Appareils page). The device moves to
 * `pending_deletion`: on its next connection the agent is told to self-destruct
 * (wipe its local config + binary), after which the device is archived — its
 * monitoring history is kept and stays browsable, but it's gone from management.
 * If the agent is online the destroy signal is sent immediately.
 */
export const devicesRequestDelete = {
    command: 'devices.requestDelete' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/** Cancel a `pending_deletion` (only effective while the agent hasn't reconnected). */
export const devicesCancelDelete = {
    command: 'devices.cancelDelete' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/**
 * Finalise a deletion immediately: archive the device now without waiting for the
 * agent to self-destruct (use when the agent is gone, or you don't care if it
 * cleans itself up). A still-connected agent is told to self-destruct best-effort,
 * but the device is archived regardless; if it ever reconnects it's refused.
 */
export const devicesForceDelete = {
    command: 'devices.forceDelete' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/**
 * Hard-purge a device and ALL its monitoring history (used by the Monitoring
 * page to remove an archived — or any — device and reset its data). Works
 * whether the agent is online or not; it does not self-destruct the agent.
 */
export const devicesDelete = {
    command: 'devices.delete' as const,
    input: z.object({ deviceId }),
    output: z.object({ deviceId })
};

export const deviceCommands = [
    devicesList,
    devicesConfirm,
    devicesRevoke,
    devicesReactivate,
    devicesRename,
    devicesReorder,
    devicesSetConfig,
    devicesWorkspaceList,
    devicesSetWorkspaces,
    devicesRequestDelete,
    devicesCancelDelete,
    devicesForceDelete,
    devicesDelete
] as const;
