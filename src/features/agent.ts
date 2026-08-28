import { z } from 'zod';
import { deviceSchema } from '../domain/device';
import { fileMutateOpSchema, fileSearchFilterSchema } from '../domain/deviceFiles';
import { deviceLogFilterSchema, DEVICE_LOG_PAGE_MAX } from '../domain/deviceLogs';
import { packageManagerIdSchema } from '../domain/packages';
import { agentLifecycleActionSchema, agentPowerActionSchema } from '../protocol/agent';

/**
 * Le transport des agents : les commandes WS qui ne font que relayer un ordre
 * du `MonitorHub` à l'agent d'un appareil (abonnement aux métriques, fichiers,
 * terminal, journaux, paquets, alimentation, service, mise à jour). C'est de
 * l'infrastructure de l'app, native ; la feature Appareils (`devices.*`, dans
 * `features/device.ts` et `features/metrics.ts`) s'en sert comme n'importe quel
 * module le ferait par la capacité `agents`.
 *
 * Deux espaces de noms `agent.*` coexistent et ne se confondent pas : les
 * TRAMES du protocole agent (`protocol/agent.ts` : `agent.hello`,
 * `agent.config`, `agent.report`...), échangées entre le serveur et le binaire
 * de l'agent sur sa propre socket, et les COMMANDES ci-dessous, envoyées par
 * le client de l'app sur la socket de session. Quatre noms existent des deux
 * côtés (`agent.collect`, `agent.update`, `agent.lifecycle`, `agent.power`) :
 * la commande est ce que demande l'utilisateur, la trame ce que reçoit l'agent.
 */

const deviceId = z.uuid();

/* Abonnement en direct */

/** Subscribe to live metric pushes for one or more devices. */
export const agentSubscribe = {
    command: 'agent.subscribe' as const,
    input: z.object({ deviceIds: z.array(deviceId).min(1).max(50) }),
    output: z.object({ deviceIds: z.array(deviceId) })
};

export const agentUnsubscribe = {
    command: 'agent.unsubscribe' as const,
    input: z.object({ deviceIds: z.array(deviceId).min(1).max(50) }),
    output: z.object({ deviceIds: z.array(deviceId) })
};

/** Ask an online device to push a fresh sample + report right now. */
export const agentCollect = {
    command: 'agent.collect' as const,
    input: z.object({ deviceId }),
    /** `requested` is false when the device isn't currently connected. */
    output: z.object({ deviceId, requested: z.boolean() })
};

/* Alimentation et processus de l'agent */

/**
 * Run a system power action on the device (shutdown / reboot / suspend / hibernate
 * / lock). Owner-or-admin; the agent must be online. The command only acknowledges
 * the request — the agent applies it best-effort and the outcome streams back as a
 * `device.powerResult` push event (the caller must be subscribed to the device).
 */
export const agentPower = {
    command: 'agent.power' as const,
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
export const agentLifecycle = {
    command: 'agent.lifecycle' as const,
    input: z.object({ deviceId, action: agentLifecycleActionSchema }),
    output: z.object({ ok: z.boolean() })
};

/* Service et privilèges */

/**
 * Enable/disable the agent's per-user autostart (survives reboot, no privilege).
 * Pushes `agent.service` to the connected agent (`install-user`/`uninstall-user`).
 */
export const agentSetAutostart = {
    command: 'agent.setAutostart' as const,
    input: z.object({ deviceId, enabled: z.boolean() }),
    output: z.object({ device: deviceSchema })
};

/**
 * Ask the agent to become a root/system service. Hybrid: the agent pops an OS auth
 * prompt if it has an interactive session, else replies `needsManualCommand` and the
 * UI shows `manualCommand` (always returned, deterministic per platform) to run on
 * the device. The new privilege/scope is observed on the agent's next report.
 */
export const agentElevate = {
    command: 'agent.elevate' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema, manualCommand: z.string() })
};

/** Ask a root/system agent to drop back to a per-user service. */
export const agentDropPrivileges = {
    command: 'agent.dropPrivileges' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema, manualCommand: z.string() })
};

/* Mise à jour */

/**
 * Push a self-update to a connected device's agent: the server resolves the newer
 * signed binary for the device's build target and sends the `agent.update` frame.
 * Admin-only (Appareils page). Fails if the agent is offline, has no known target,
 * the binary is missing/unsigned, or it's already up to date.
 */
export const agentUpdate = {
    command: 'agent.update' as const,
    input: z.object({ deviceId }),
    output: z.object({ device: deviceSchema })
};

/* Paquets */

/**
 * Ask the agent to enumerate its package managers + pending updates. The result
 * arrives asynchronously as a `package.list` push event (the caller must be
 * subscribed to the device). The command itself only acknowledges the request.
 */
export const agentListPackages = {
    command: 'agent.listPackages' as const,
    input: z.object({ deviceId }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Apply all pending updates of one manager. Progress streams as `package.progress`
 * events, ending with `package.done`. Fails if the agent is offline or the manager
 * needs root and the agent isn't privileged (elevate it first, see `agent.elevate`).
 */
export const agentUpgradePackages = {
    command: 'agent.upgradePackages' as const,
    input: z.object({ deviceId, manager: packageManagerIdSchema }),
    output: z.object({ ok: z.boolean() })
};

/* Journaux */

/**
 * Ask the agent to enumerate the log sources present on the device (system journal,
 * Docker containers, log files…). Owner-or-admin + agent online. The command only
 * acknowledges; the list arrives as a `device.logSources` push event (the caller
 * must be subscribed to the device).
 */
export const agentLogSources = {
    command: 'agent.logSources' as const,
    input: z.object({ deviceId }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Query one source with an advanced filter. `queryId` correlates the streamed
 * result back to this request (results have no requestId). Lines arrive as one or
 * more `device.logLines` push events, the last carrying `done: true`.
 */
export const agentLogQuery = {
    command: 'agent.logQuery' as const,
    input: z.object({
        deviceId,
        sourceId: z.string().min(1).max(512),
        /** Client-generated id echoed back on every `device.logLines` for this query. */
        queryId: z.string().min(1).max(64),
        filter: deviceLogFilterSchema.optional(),
        limit: z.number().int().positive().max(DEVICE_LOG_PAGE_MAX).optional()
    }),
    output: z.object({ ok: z.boolean() })
};

/* Terminal */

const sessionId = z.string().min(1).max(64);
const cols = z.number().int().min(1).max(2000);
const rows = z.number().int().min(1).max(2000);
/** Base64-encoded terminal bytes, capped per frame (~1.5 MB). */
const termData = z.string().max(2_000_000);
/**
 * Optional OS account to open the session under. Restricted to safe username
 * characters (no shell metacharacters), since it reaches a `su` on the device.
 */
export const terminalUser = z
    .string()
    .regex(/^[A-Za-z0-9._-]+$/, 'Nom d’utilisateur invalide')
    .max(32);

/**
 * Open an interactive terminal (PTY) on the device. Owner-or-admin + agent online.
 * `sessionId` is client-generated and ties every later input/resize/close and the
 * streamed `device.termOutput` / `device.termExit` push events together (the caller
 * must be subscribed). `user` runs the shell under that account (`su -l`); omitted
 * → the account the agent itself runs as.
 */
export const agentTermOpen = {
    command: 'agent.termOpen' as const,
    input: z.object({ deviceId, sessionId, cols, rows, user: terminalUser.optional() }),
    output: z.object({ ok: z.boolean() })
};

/** Send input (keystrokes / paste) to a terminal session. `data` is base64 bytes. */
export const agentTermInput = {
    command: 'agent.termInput' as const,
    input: z.object({ deviceId, sessionId, data: termData }),
    output: z.object({ ok: z.boolean() })
};

/** Resize a terminal session's PTY to match the client viewport. */
export const agentTermResize = {
    command: 'agent.termResize' as const,
    input: z.object({ deviceId, sessionId, cols, rows }),
    output: z.object({ ok: z.boolean() })
};

/** Close a terminal session (kills the shell and frees the PTY). */
export const agentTermClose = {
    command: 'agent.termClose' as const,
    input: z.object({ deviceId, sessionId }),
    output: z.object({ ok: z.boolean() })
};

/* Fichiers */

/** Correlates a request to its streamed result (results carry no requestId). */
const opId = z.string().min(1).max(64);
const path = z.string().min(1).max(4096);

/**
 * List a directory. Owner-or-admin + agent online. The listing arrives as a
 * `device.filesListing` push event keyed by `opId` (the caller must be subscribed).
 */
export const agentFilesList = {
    command: 'agent.filesList' as const,
    input: z.object({ deviceId, opId, path }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Analyse a directory's recursive disk usage (ncdu-style): the total size of each
 * immediate child. Result arrives as a `device.filesUsage` push event.
 */
export const agentFilesAnalyze = {
    command: 'agent.filesAnalyze' as const,
    input: z.object({ deviceId, opId, path }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Recursively search a directory with an advanced filter (name/extension/content,
 * date & size windows). Matches arrive as a `device.filesMatches` push event.
 */
export const agentFilesSearch = {
    command: 'agent.filesSearch' as const,
    input: z.object({ deviceId, opId, path, filter: fileSearchFilterSchema }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Mutate the filesystem: `delete` (file or directory, recursive), `mkdir`, or
 * `rename` (needs `dest`). The outcome arrives as a `device.filesOp` push event.
 */
export const agentFilesMutate = {
    command: 'agent.filesMutate' as const,
    input: z.object({ deviceId, opId, op: fileMutateOpSchema, path, dest: path.optional() }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Download a file. Bytes stream back as `device.filesChunk` push events keyed by
 * `opId` (base64, the last with `done: true`); the client reassembles them.
 */
export const agentFilesDownload = {
    command: 'agent.filesDownload' as const,
    input: z.object({ deviceId, opId, path }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Upload one chunk of a file at `offset` (0 truncates/creates it). The completion
 * (on `done`) arrives as a `device.filesOp` push event (op `upload`).
 */
export const agentFilesUpload = {
    command: 'agent.filesUpload' as const,
    input: z.object({
        deviceId,
        opId,
        path,
        offset: z.number().int().nonnegative(),
        data: z.string().max(1_400_000),
        done: z.boolean()
    }),
    output: z.object({ ok: z.boolean() })
};

export const agentCommands = [
    agentSubscribe,
    agentUnsubscribe,
    agentCollect,
    agentPower,
    agentLifecycle,
    agentSetAutostart,
    agentElevate,
    agentDropPrivileges,
    agentUpdate,
    agentListPackages,
    agentUpgradePackages,
    agentLogSources,
    agentLogQuery,
    agentTermOpen,
    agentTermInput,
    agentTermResize,
    agentTermClose,
    agentFilesList,
    agentFilesAnalyze,
    agentFilesSearch,
    agentFilesMutate,
    agentFilesDownload,
    agentFilesUpload
] as const;
