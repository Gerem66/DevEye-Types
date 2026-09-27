import { z } from 'zod';
import {
    cloudSyncProgressSchema,
    cloudSyncShareStateSchema,
    sha256HexSchema,
    SYNC_CHUNK_MAX,
    SYNC_INDEX_BATCH_MAX,
    SYNC_REL_PATH_MAX,
    SYNC_STORAGE_PATH_MAX,
    syncEntryKindSchema,
    syncIndexFingerprintSchema,
    syncScanModeSchema,
    syncShareStatusSchema
} from '../domain/syncProtocol';
import { pathExclusionSchema } from '../domain/pathExclusions';
import {
    fileListingSchema,
    fileMatchSchema,
    fileMutateOpSchema,
    fileSearchFilterSchema,
    fileUsageEntrySchema
} from '../domain/deviceFiles';
import {
    deviceLogAnchorSchema,
    deviceLogFilterSchema,
    deviceLogLineSchema,
    deviceLogSourceSchema
} from '../domain/deviceLogs';
import {
    containerEngineSchema,
    dockerActionSchema,
    dockerInventorySchema,
    dockerStatSchema
} from '../domain/deviceDocker';
import { metricsBatchSchema, metricSnapshotSchema } from '../domain/metrics';
import { packageManagerIdSchema, packageManagerSchema } from '../domain/packages';
import {
    authWindowSchema,
    deviceReportSchema,
    integrityReportSchema,
    processCaptureSchema
} from '../domain/report';
import { agentTargetSchema } from '../http/device';
import { ProtocolErrorSchema } from './error';

/**
 * Agent <-> Server wire protocol (distinct from the user feature protocol).
 * The agent authenticates with its device token, then streams metric batches,
 * reports and replies; the server acknowledges and pushes orders.
 */

/** Command names the agent may send to the server. */
export const AGENT_METRICS_BATCH = 'metrics.batch' as const;
export const AGENT_HELLO = 'agent.hello' as const;
export const AGENT_REPORT = 'agent.report' as const;
/** Agent's reply to `agent.destroy`: whether it managed to wipe itself. */
export const AGENT_DESTROYED = 'agent.destroyed' as const;
/** Agent's reply to `agent.update`: outcome of a self-update attempt. */
export const AGENT_UPDATED = 'agent.updated' as const;

export const agentUpdatedMessagePayloadSchema = z.object({
    deviceId: z.uuid(),
    /** True when the new binary was verified and swapped in (a restart follows). */
    ok: z.boolean(),
    /** Version the agent updated to, when `ok`. */
    version: z.string().optional(),
    /** Why the update was refused/aborted, when `!ok` (binary left untouched). */
    error: z.string().max(255).optional()
});

/**
 * Persistence/privilege action the server can ask the agent to perform:
 * - `install-user`   install a per-user autostart (no privilege needed),
 * - `uninstall-user` remove it,
 * - `elevate`        (try to) become a root/system service — see the hybrid flow,
 * - `drop`           go back from system/root to a per-user service.
 */
export const agentServiceActionSchema = z.enum([
    'install-user',
    'uninstall-user',
    'elevate',
    'drop'
]);
export type AgentServiceAction = z.infer<typeof agentServiceActionSchema>;

/**
 * System power action the server can ask the agent to perform on its host.
 * Best-effort per platform; the agent reports the outcome (`agent.powerResult`).
 * - `shutdown`  power the machine off,
 * - `reboot`    restart it,
 * - `suspend`   sleep (suspend to RAM),
 * - `hibernate` deep sleep (suspend to disk),
 * - `lock`      lock the screen/session (the machine keeps running).
 */
export const agentPowerActionSchema = z.enum([
    'shutdown',
    'reboot',
    'suspend',
    'hibernate',
    'lock'
]);
export type AgentPowerAction = z.infer<typeof agentPowerActionSchema>;

/** Agent's reply to `pkg.list`: the package managers present + their pending counts. */
export const AGENT_PKG_LIST_RESULT = 'pkg.listResult' as const;

export const agentPkgListResultPayloadSchema = z.object({
    deviceId: z.uuid(),
    managers: z.array(packageManagerSchema)
});

/** Live line of an in-progress `pkg.upgrade`. */
export const AGENT_PKG_PROGRESS = 'pkg.progress' as const;

export const agentPkgProgressPayloadSchema = z.object({
    deviceId: z.uuid(),
    manager: packageManagerIdSchema,
    /** 0–100 when the tool emits it, else null (synthesise i/N or show the line). */
    percent: z.number().min(0).max(100).nullable().optional(),
    /** Coarse phase label (e.g. `download`, `install`) when derivable. */
    phase: z.string().max(40).optional(),
    /** The raw output line (already trimmed) to surface in the live log. */
    line: z.string().max(2000)
});

/** Final outcome of a `pkg.upgrade`. */
export const AGENT_PKG_DONE = 'pkg.done' as const;

export const agentPkgDonePayloadSchema = z.object({
    deviceId: z.uuid(),
    manager: packageManagerIdSchema,
    ok: z.boolean(),
    rebootRequired: z.boolean().optional(),
    error: z.string().max(500).optional()
});

/** Agent's reply to `docker.inventory`: the host's whole container inventory. */
export const AGENT_DOCKER_INVENTORY_RESULT = 'docker.inventoryResult' as const;

export const agentDockerInventoryResultPayloadSchema = z.object({
    deviceId: z.uuid(),
    inventory: dockerInventorySchema
});

/** Agent's reply to `docker.stats`: a one-shot resource sample per running container. */
export const AGENT_DOCKER_STATS_RESULT = 'docker.statsResult' as const;

export const agentDockerStatsResultPayloadSchema = z.object({
    deviceId: z.uuid(),
    stats: z.array(dockerStatSchema)
});

/** Live output line of a long `docker.action` (pull, prune, recreate). */
export const AGENT_DOCKER_PROGRESS = 'docker.progress' as const;

export const agentDockerProgressPayloadSchema = z.object({
    deviceId: z.uuid(),
    /** Correlates back to the originating `docker.action` (echoed verbatim). */
    opId: z.string().max(64),
    line: z.string().max(2000)
});

/** Final outcome of a `docker.action`. */
export const AGENT_DOCKER_DONE = 'docker.done' as const;

export const agentDockerDonePayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: z.string().max(64),
    action: dockerActionSchema,
    ok: z.boolean(),
    error: z.string().max(500).optional()
});

/** Agent's reply to `agent.service`: outcome of a persistence/privilege change. */
export const AGENT_SERVICE_RESULT = 'agent.serviceResult' as const;

export const agentServiceResultPayloadSchema = z.object({
    deviceId: z.uuid(),
    action: agentServiceActionSchema,
    ok: z.boolean(),
    /**
     * For `elevate`/`drop`: the agent had no interactive session to pop an OS auth
     * prompt, so the user must run the elevated command on the device manually
     * (the UI already shows it). The action itself was not performed.
     */
    needsManualCommand: z.boolean().optional(),
    error: z.string().max(255).optional()
});

/** Agent's reply to `agent.power`: outcome of a system power action. */
export const AGENT_POWER_RESULT = 'agent.powerResult' as const;

export const agentPowerResultPayloadSchema = z.object({
    deviceId: z.uuid(),
    action: agentPowerActionSchema,
    ok: z.boolean(),
    /** Why the action could not be carried out, when `!ok`. */
    error: z.string().max(255).optional()
});

/** Agent's reply to `log.sources`: the log sources discovered on the device. */
export const AGENT_LOG_SOURCES_RESULT = 'log.sourcesResult' as const;

export const agentLogSourcesResultPayloadSchema = z.object({
    deviceId: z.uuid(),
    sources: z.array(deviceLogSourceSchema)
});

/** Agent's reply to `log.query`: a chunk of matched lines (last one `done: true`). */
export const AGENT_LOG_LINES = 'log.lines' as const;

export const agentLogLinesPayloadSchema = z.object({
    deviceId: z.uuid(),
    /** Correlates back to the originating `log.query` (echoed verbatim). */
    queryId: z.string().max(64),
    lines: z.array(deviceLogLineSchema),
    /** True on the final chunk of this query. */
    done: z.boolean(),
    /** Set on the final chunk when the query failed. */
    error: z.string().max(500).optional()
});

/** Base64-encoded terminal payload (raw PTY bytes), capped per frame (~1.5 MB). */
const terminalDataSchema = z.string().max(2_000_000);

/** Agent → server: a chunk of PTY output for one terminal session. */
export const AGENT_TERM_OUTPUT = 'term.output' as const;

export const agentTermOutputPayloadSchema = z.object({
    deviceId: z.uuid(),
    /** Client-generated session id (echoed from `term.open`). */
    sessionId: z.string().max(64),
    /** Base64 of the raw PTY output bytes. */
    data: terminalDataSchema
});

/** Agent → server: a terminal session ended (shell exited, killed, or open failed). */
export const AGENT_TERM_EXIT = 'term.exit' as const;

export const agentTermExitPayloadSchema = z.object({
    deviceId: z.uuid(),
    sessionId: z.string().max(64),
    /** Process exit code when known. */
    code: z.number().int().nullable().optional(),
    /** Reason when the session ended on an error (e.g. the shell couldn't spawn). */
    error: z.string().max(255).optional()
});

/** Agent → server: a directory listing (reply to `files.list`). */
export const AGENT_FILES_LISTING = 'files.listing' as const;
export const agentFilesListingPayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: z.string().max(64),
    listing: fileListingSchema.nullable(),
    /** Set when the directory couldn't be read. */
    error: z.string().max(500).optional()
});

/** Agent → server: recursive usage of a directory's children (reply to `files.analyze`). */
export const AGENT_FILES_USAGE = 'files.usage' as const;
export const agentFilesUsagePayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: z.string().max(64),
    entries: z.array(fileUsageEntrySchema),
    error: z.string().max(500).optional()
});

/** Agent → server: search hits (reply to `files.search`). */
export const AGENT_FILES_MATCHES = 'files.matches' as const;
export const agentFilesMatchesPayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: z.string().max(64),
    matches: z.array(fileMatchSchema),
    /** True when the result was capped (more hits exist). */
    truncated: z.boolean(),
    error: z.string().max(500).optional()
});

/** Agent → server: outcome of a `files.mutate` (delete/mkdir/rename) or an upload. */
export const AGENT_FILES_OP_RESULT = 'files.opResult' as const;
export const agentFilesOpResultPayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: z.string().max(64),
    /** The operation label (a mutate op, or `upload`). */
    op: z.string().max(32),
    ok: z.boolean(),
    error: z.string().max(500).optional()
});

/** Agent → server: one chunk of a downloaded file (`data` base64; last has `done`). */
export const AGENT_FILES_CHUNK = 'files.chunk' as const;
export const agentFilesChunkPayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: z.string().max(64),
    /** Base64 of the raw file bytes for this chunk (empty on the terminal frame). */
    data: z.string().max(1_400_000),
    /** True on the final chunk. */
    done: z.boolean(),
    /** Set on the final chunk when the download failed. */
    error: z.string().max(500).optional()
});

/** Agent → server: one piece of a folder archive (`data` base64). Consumes one credit. */
export const AGENT_FILES_ARCHIVE_CHUNK = 'files.archiveChunk' as const;
export const agentFilesArchiveChunkPayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: z.string().max(64),
    /** 0, 1, 2… : a gap or a repeat fails the archive, frames are never reordered. */
    seq: z.number().int().nonnegative(),
    data: z.string().max(1_400_000)
});
export type AgentFilesArchiveChunkPayload = z.infer<typeof agentFilesArchiveChunkPayloadSchema>;

/**
 * Agent → server: a sign of life while the archive has nothing to send yet
 * (compression can take long to fill a piece). Consumes no credit.
 */
export const AGENT_FILES_ARCHIVE_PROGRESS = 'files.archiveProgress' as const;
export const agentFilesArchiveProgressPayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: z.string().max(64),
    entries: z.number().int().nonnegative(),
    bytesRead: z.number().int().nonnegative()
});
export type AgentFilesArchiveProgressPayload = z.infer<
    typeof agentFilesArchiveProgressPayloadSchema
>;

/** Agent → server: how a folder archive ended. The last frame of the operation. */
export const AGENT_FILES_ARCHIVE_END = 'files.archiveEnd' as const;
export const agentFilesArchiveEndPayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: z.string().max(64),
    ok: z.boolean(),
    error: z.string().max(500).optional(),
    files: z.number().int().nonnegative(),
    dirs: z.number().int().nonnegative(),
    bytesRead: z.number().int().nonnegative(),
    /** Entries left out because they could not be read. */
    skipped: z.number().int().nonnegative(),
    /** Files whose size changed while they were read: archived padded or cut. */
    changed: z.number().int().nonnegative(),
    /** The first skipped or changed entries, and why. */
    samples: z.array(z.object({ path: z.string().max(1024), reason: z.string().max(120) })).max(20)
});
export type AgentFilesArchiveEndPayload = z.infer<typeof agentFilesArchiveEndPayloadSchema>;

const syncOpId = z.string().min(1).max(64);
const syncRelPath = z.string().min(1).max(SYNC_REL_PATH_MAX);

/**
 * CloudSync, agent → serveur. La correction est toujours basée scan : l'agent
 * ne pousse jamais de contenu spontanément, il signale (`sync.changed`), scanne
 * sur ordre (`sync.index`), et transfère sur ordre (`sync.chunk`).
 */

/** Le watcher local (débouncé) a vu bouger le dossier d'un partage. */
export const AGENT_SYNC_CHANGED = 'sync.changed' as const;
export const agentSyncChangedPayloadSchema = z.object({
    deviceId: z.uuid(),
    shareId: z.number().int().positive()
});
export type AgentSyncChangedPayload = z.infer<typeof agentSyncChangedPayloadSchema>;

/**
 * Une entrée du scan local (exclusions déjà appliquées). Fichiers réguliers,
 * plus les dossiers VIDES : un dossier non vide est implicite (ses fichiers le
 * recréent), et l'indexer coûterait une ligne par dossier pour rien.
 */
export const syncIndexEntrySchema = z.object({
    relPath: syncRelPath,
    kind: syncEntryKindSchema.default('file'),
    hash: sha256HexSchema,
    size: z.number().int().nonnegative(),
    /** Millisecondes unix. */
    mtime: z.number().int().nonnegative(),
    /** Bits de permission Unix (`& 0o777`) ; `null` depuis un agent Windows. */
    mode: z.number().int().min(0).max(0o777).nullable().default(null)
});
export type SyncIndexEntry = z.infer<typeof syncIndexEntrySchema>;

/** Un lot d'index du scan (réponse à `sync.scan`, dernier lot `done: true`). */
export const AGENT_SYNC_INDEX = 'sync.index' as const;
export const agentSyncIndexPayloadSchema = z.object({
    deviceId: z.uuid(),
    sessionId: syncOpId,
    shareId: z.number().int().positive(),
    entries: z.array(syncIndexEntrySchema).max(SYNC_INDEX_BATCH_MAX),
    done: z.boolean(),
    /**
     * L'agent a-t-il réellement parcouru le disque ? `false` répond à un
     * `sync.scan` en mode `auto` sur un partage que le watcher sait intact :
     * aucune entrée, seule `fingerprint` est renseignée, et le serveur VÉRIFIE
     * qu'elle correspond à sa baseline (une vérification fausse coûte un scan
     * complet, jamais une divergence). Le défaut `true` rend un vieil agent
     * inoffensif.
     */
    scanned: z.boolean().default(true),
    /** Empreinte de l'index détenu par l'agent, quand il sait la calculer. */
    fingerprint: syncIndexFingerprintSchema.nullable().default(null),
    /** Posé sur le lot final quand le scan a échoué (la session est abandonnée). */
    error: z.string().max(500).optional()
});
export type AgentSyncIndexPayload = z.infer<typeof agentSyncIndexPayloadSchema>;

/**
 * Un chunk d'upload (réponse à `sync.push`). La frame finale porte le hash,
 * la taille et le mtime constatés — s'ils diffèrent de l'annonce du scan, le
 * fichier a bougé entre-temps et le serveur jette le transfert.
 */
export const AGENT_SYNC_CHUNK = 'sync.chunk' as const;
export const agentSyncChunkPayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: syncOpId,
    /** Base64 des octets du chunk (vide autorisé sur la frame terminale). */
    data: z.string().max(SYNC_CHUNK_MAX),
    done: z.boolean(),
    hash: sha256HexSchema.optional(),
    size: z.number().int().nonnegative().optional(),
    mtime: z.number().int().nonnegative().optional(),
    error: z.string().max(500).optional()
});
export type AgentSyncChunkPayload = z.infer<typeof agentSyncChunkPayloadSchema>;

/** Crédit de flux : l'agent a écrit le chunk `seq` d'un `sync.applyChunk`. */
export const AGENT_SYNC_ACK = 'sync.ack' as const;
export const agentSyncAckPayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: syncOpId,
    seq: z.number().int().nonnegative()
});
export type AgentSyncAckPayload = z.infer<typeof agentSyncAckPayloadSchema>;

/**
 * Issue d'une op locale : install atomique (`apply`), création de dossier vide
 * (`applyDir`), copie locale d'un contenu déjà présent (`applyLocal`), amorce
 * de download avec offset de reprise (`applyReady`), corbeille (`delete`),
 * upload (`push`).
 */
export const AGENT_SYNC_OP_RESULT = 'sync.opResult' as const;
export const agentSyncOpResultPayloadSchema = z.object({
    deviceId: z.uuid(),
    opId: syncOpId,
    op: z.enum(['apply', 'applyDir', 'applyLocal', 'applyReady', 'delete', 'move', 'push']),
    ok: z.boolean(),
    /** `applyReady` seulement : octets de clair déjà détenus pour ce hash. */
    resumeFrom: z.number().int().nonnegative().optional(),
    error: z.string().max(500).optional()
});
export type AgentSyncOpResultPayload = z.infer<typeof agentSyncOpResultPayloadSchema>;

export const agentReportMessagePayloadSchema = z.object({
    deviceId: z.uuid(),
    report: deviceReportSchema
});

/** Manifeste des surfaces de persistance (Sentinelle). */
export const AGENT_INTEGRITY = 'agent.integrity' as const;

export const agentIntegrityMessagePayloadSchema = z.object({
    deviceId: z.uuid(),
    integrity: integrityReportSchema
});

/** Fenêtre d'issues d'authentification (Sentinelle). */
export const AGENT_AUTH_EVENTS = 'agent.authEvents' as const;

export const agentAuthEventsMessagePayloadSchema = z.object({
    deviceId: z.uuid(),
    auth: authWindowSchema
});

export const agentDestroyedMessagePayloadSchema = z.object({
    deviceId: z.uuid(),
    /** True when the agent successfully wiped its local config (and binary). */
    ok: z.boolean(),
    /** Failure reason when `ok` is false (deletion is then aborted server-side). */
    error: z.string().max(255).optional()
});

export const agentClientMessageSchema = z.discriminatedUnion('command', [
    z.object({
        command: z.literal(AGENT_HELLO),
        payload: z.object({
            agentVersion: z.string().min(1),
            /**
             * Build target the running agent was compiled for (e.g. `linux-x86_64`).
             * Lets the server resolve which binary to push for a self-update.
             * Optional: agents predating self-update don't send it.
             */
            target: agentTargetSchema.optional()
        })
    }),
    z.object({
        command: z.literal(AGENT_METRICS_BATCH),
        payload: metricsBatchSchema
    }),
    z.object({
        command: z.literal(AGENT_REPORT),
        payload: agentReportMessagePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_INTEGRITY),
        payload: agentIntegrityMessagePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_AUTH_EVENTS),
        payload: agentAuthEventsMessagePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_DESTROYED),
        payload: agentDestroyedMessagePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_UPDATED),
        payload: agentUpdatedMessagePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SERVICE_RESULT),
        payload: agentServiceResultPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_PKG_LIST_RESULT),
        payload: agentPkgListResultPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_PKG_PROGRESS),
        payload: agentPkgProgressPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_PKG_DONE),
        payload: agentPkgDonePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_POWER_RESULT),
        payload: agentPowerResultPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_DOCKER_INVENTORY_RESULT),
        payload: agentDockerInventoryResultPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_DOCKER_STATS_RESULT),
        payload: agentDockerStatsResultPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_DOCKER_PROGRESS),
        payload: agentDockerProgressPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_DOCKER_DONE),
        payload: agentDockerDonePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_LOG_SOURCES_RESULT),
        payload: agentLogSourcesResultPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_LOG_LINES),
        payload: agentLogLinesPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_TERM_OUTPUT),
        payload: agentTermOutputPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_TERM_EXIT),
        payload: agentTermExitPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_LISTING),
        payload: agentFilesListingPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_USAGE),
        payload: agentFilesUsagePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_MATCHES),
        payload: agentFilesMatchesPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_OP_RESULT),
        payload: agentFilesOpResultPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_CHUNK),
        payload: agentFilesChunkPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_ARCHIVE_CHUNK),
        payload: agentFilesArchiveChunkPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_ARCHIVE_PROGRESS),
        payload: agentFilesArchiveProgressPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_ARCHIVE_END),
        payload: agentFilesArchiveEndPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SYNC_CHANGED),
        payload: agentSyncChangedPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SYNC_INDEX),
        payload: agentSyncIndexPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SYNC_CHUNK),
        payload: agentSyncChunkPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SYNC_ACK),
        payload: agentSyncAckPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SYNC_OP_RESULT),
        payload: agentSyncOpResultPayloadSchema
    })
]);

export type AgentClientMessage = z.infer<typeof agentClientMessageSchema>;

/** Command names the server may send to the agent. */
export const AGENT_ACK = 'agent.ack' as const;
export const AGENT_ERROR = 'agent.error' as const;
/** Ask the agent to collect and push a fresh sample + report immediately. */
export const AGENT_COLLECT = 'agent.collect' as const;
/**
 * Demande un relevé Sentinelle immédiat (persistance + authentification).
 * Distinct d'`agent.collect` : celui-ci coûte quelques millisecondes, un relevé
 * de persistance empreinte des centaines de fichiers.
 */
export const AGENT_SCAN = 'agent.scan' as const;
/** Push the per-device collection config (cadences + capture mode) to the agent. */
export const AGENT_CONFIG = 'agent.config' as const;
/** Server → agent: a fresh device token replacing the one about to expire; the agent persists it. */
export const AGENT_TOKEN_ROTATE = 'agent.tokenRotate' as const;
export const agentTokenRotatePayloadSchema = z.object({ token: z.string().min(1).max(4096) });
export type AgentTokenRotatePayload = z.infer<typeof agentTokenRotatePayloadSchema>;
/**
 * WebSocket close code for an authenticated agent whose device waits for
 * approval: it retries on a short fixed delay instead of backing off like a
 * refused one. Every refusal (unknown, invalid or archived) stays `1008`, so
 * only a holder of a valid token learns the device is pending. Mirrored by
 * `CLOSE_PENDING_APPROVAL` in the agent's `runner.rs`.
 */
export const AGENT_CLOSE_PENDING_APPROVAL = 4001;
/** Tell the agent to self-destruct (wipe its local config + binary) and exit. */
export const AGENT_DESTROY = 'agent.destroy' as const;
/** Tell the agent to download, verify and swap in a newer signed binary. */
export const AGENT_UPDATE = 'agent.update' as const;

/**
 * Self-update order. The agent downloads the binary for `targetId` from
 * `/api/agent/self-update/:target` (device-token auth), then refuses to replace
 * itself unless BOTH the sha256 matches AND the ed25519 `signature` (over the
 * sha256 bytes) verifies against its embedded public key.
 */
export const agentUpdatePayloadSchema = z.object({
    targetId: agentTargetSchema,
    version: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    /** Base64 ed25519 signature over the 32 raw bytes of `sha256`. */
    signature: z.string().min(1)
});

export type AgentUpdatePayload = z.infer<typeof agentUpdatePayloadSchema>;

/**
 * Ask the agent to stop or cleanly restart its own *process* (not the machine):
 * - `stop`    exit now. Supervised (autostart service) → the manager relaunches
 *   it; standalone → the device stays offline until a manual relaunch.
 * - `restart` exit and come back: the manager relaunches a supervised agent, a
 *   standalone one respawns itself first.
 * Fire-and-forget: no reply frame (the process exits) — the outcome is observed
 * through presence (offline, then online again for a restart).
 */
export const AGENT_LIFECYCLE = 'agent.lifecycle' as const;

export const agentLifecycleActionSchema = z.enum(['stop', 'restart']);
export type AgentLifecycleAction = z.infer<typeof agentLifecycleActionSchema>;

export const agentLifecyclePayloadSchema = z.object({ action: agentLifecycleActionSchema });
export type AgentLifecyclePayload = z.infer<typeof agentLifecyclePayloadSchema>;

/** Tell the agent to change its persistence/privilege install (see `AgentServiceAction`). */
export const AGENT_SERVICE = 'agent.service' as const;

export const agentServicePayloadSchema = z.object({ action: agentServiceActionSchema });
export type AgentServicePayload = z.infer<typeof agentServicePayloadSchema>;

/** Ask the agent to enumerate its package managers + pending updates (`pkg.listResult`). */
export const AGENT_PKG_LIST = 'pkg.list' as const;

/** Ask the agent to apply all updates of one manager, streaming `pkg.progress`. */
export const AGENT_PKG_UPGRADE = 'pkg.upgrade' as const;

export const agentPkgUpgradePayloadSchema = z.object({ manager: packageManagerIdSchema });
export type AgentPkgUpgradePayload = z.infer<typeof agentPkgUpgradePayloadSchema>;

/** Ask the agent for its container inventory (`docker.inventoryResult`). */
export const AGENT_DOCKER_INVENTORY = 'docker.inventory' as const;

/** Ask the agent for a one-shot resource sample of the running containers. */
export const AGENT_DOCKER_STATS = 'docker.stats' as const;

/**
 * Ask the agent to act on a container, image, volume or network. `opId`
 * correlates the streamed output and the outcome back to this order. `target`
 * is the object's own identifier, and it is the ONLY caller-supplied value that
 * reaches a command line; the untargeted actions (the prunes) carry none.
 */
export const AGENT_DOCKER_ACTION = 'docker.action' as const;

export const agentDockerActionPayloadSchema = z.object({
    opId: z.string().min(1).max(64),
    engine: containerEngineSchema,
    action: dockerActionSchema,
    target: z.string().max(512).nullable()
});
export type AgentDockerActionPayload = z.infer<typeof agentDockerActionPayloadSchema>;

/** Ask the agent to perform a system power action (`agent.powerResult` reports the outcome). */
export const AGENT_POWER = 'agent.power' as const;

export const agentPowerPayloadSchema = z.object({ action: agentPowerActionSchema });
export type AgentPowerPayload = z.infer<typeof agentPowerPayloadSchema>;

/** Ask the agent to enumerate its log sources (`log.sourcesResult` carries them). */
export const AGENT_LOG_SOURCES = 'log.sources' as const;

/** Ask the agent to run one log query; results stream as `log.lines`. */
export const AGENT_LOG_QUERY = 'log.query' as const;

export const agentLogQueryPayloadSchema = z.object({
    queryId: z.string().max(64),
    sourceId: z.string().min(1).max(512),
    filter: deviceLogFilterSchema.optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().nonnegative().optional(),
    anchor: deviceLogAnchorSchema.optional()
});
export type AgentLogQueryPayload = z.infer<typeof agentLogQueryPayloadSchema>;

const terminalCols = z.number().int().min(1).max(2000);
const terminalRows = z.number().int().min(1).max(2000);

/** Open an interactive PTY session. `user`, when set, runs the shell under that
 * account (`su -l`); omitted → the account the agent runs as. */
export const AGENT_TERM_OPEN = 'term.open' as const;
export const agentTermOpenPayloadSchema = z.object({
    sessionId: z.string().max(64),
    cols: terminalCols,
    rows: terminalRows,
    user: z.string().max(32).optional()
});
export type AgentTermOpenPayload = z.infer<typeof agentTermOpenPayloadSchema>;

/** Write input (keystrokes) to a session's PTY. `data` is base64 of raw bytes. */
export const AGENT_TERM_INPUT = 'term.input' as const;
export const agentTermInputPayloadSchema = z.object({
    sessionId: z.string().max(64),
    data: terminalDataSchema
});
export type AgentTermInputPayload = z.infer<typeof agentTermInputPayloadSchema>;

/** Resize a session's PTY to match the client terminal. */
export const AGENT_TERM_RESIZE = 'term.resize' as const;
export const agentTermResizePayloadSchema = z.object({
    sessionId: z.string().max(64),
    cols: terminalCols,
    rows: terminalRows
});
export type AgentTermResizePayload = z.infer<typeof agentTermResizePayloadSchema>;

/** Close a session: kill the shell and free the PTY. */
export const AGENT_TERM_CLOSE = 'term.close' as const;
export const agentTermClosePayloadSchema = z.object({ sessionId: z.string().max(64) });
export type AgentTermClosePayload = z.infer<typeof agentTermClosePayloadSchema>;

const filesOpId = z.string().max(64);
const filesPath = z.string().min(1).max(4096);

/** List a directory (replies `files.listing`). */
export const AGENT_FILES_LIST = 'files.list' as const;
export const agentFilesListPayloadSchema = z.object({ opId: filesOpId, path: filesPath });
export type AgentFilesListPayload = z.infer<typeof agentFilesListPayloadSchema>;

/** Analyse recursive disk usage of a directory's children (replies `files.usage`). */
export const AGENT_FILES_ANALYZE = 'files.analyze' as const;
export const agentFilesAnalyzePayloadSchema = z.object({ opId: filesOpId, path: filesPath });
export type AgentFilesAnalyzePayload = z.infer<typeof agentFilesAnalyzePayloadSchema>;

/** Recursively search a directory (replies `files.matches`). */
export const AGENT_FILES_SEARCH = 'files.search' as const;
export const agentFilesSearchPayloadSchema = z.object({
    opId: filesOpId,
    path: filesPath,
    filter: fileSearchFilterSchema
});
export type AgentFilesSearchPayload = z.infer<typeof agentFilesSearchPayloadSchema>;

/** Mutate the filesystem: delete / mkdir / rename (replies `files.opResult`). */
export const AGENT_FILES_MUTATE = 'files.mutate' as const;
export const agentFilesMutatePayloadSchema = z.object({
    opId: filesOpId,
    op: fileMutateOpSchema,
    path: filesPath,
    dest: filesPath.optional()
});
export type AgentFilesMutatePayload = z.infer<typeof agentFilesMutatePayloadSchema>;

/** Download a file (streams `files.chunk`). */
export const AGENT_FILES_DOWNLOAD = 'files.download' as const;
export const agentFilesDownloadPayloadSchema = z.object({ opId: filesOpId, path: filesPath });
export type AgentFilesDownloadPayload = z.infer<typeof agentFilesDownloadPayloadSchema>;

/** Upload one chunk of a file at `offset` (replies `files.opResult` when `done`). */
export const AGENT_FILES_UPLOAD = 'files.upload' as const;
export const agentFilesUploadPayloadSchema = z.object({
    opId: filesOpId,
    path: filesPath,
    /** Byte offset of this chunk (0 truncates/creates the file). */
    offset: z.number().int().nonnegative(),
    /** Base64 of this chunk's bytes. */
    data: z.string().max(1_400_000),
    /** True on the final chunk (the agent then confirms via `files.opResult`). */
    done: z.boolean()
});
export type AgentFilesUploadPayload = z.infer<typeof agentFilesUploadPayloadSchema>;

/**
 * Archive a folder as a `.tar.gz` built on the machine, streamed as
 * `files.archiveChunk` frames, each spending one credit. The agent sends no
 * more than the credits the server grants: memory on both sides stays bounded
 * whatever the folder's size, and a slow destination slows the machine down.
 */
export const AGENT_FILES_ARCHIVE = 'files.archive' as const;
/** What an agent that knows `files.archive` declares in `report.agent.probes`. */
export const AGENT_FOLDER_ARCHIVE_PROBE = 'folderArchive';
export const agentFilesArchivePayloadSchema = z.object({
    opId: filesOpId,
    path: filesPath,
    exclusions: z.array(pathExclusionSchema).max(200),
    /** Do not descend into another filesystem (a network mount, a removable disk). */
    oneFileSystem: z.boolean(),
    /** Credits granted up front. */
    window: z.number().int().min(1).max(64)
});
export type AgentFilesArchivePayload = z.infer<typeof agentFilesArchivePayloadSchema>;

/** More credits for a folder archive, as the server consumes its pieces. */
export const AGENT_FILES_ARCHIVE_CREDIT = 'files.archiveCredit' as const;
export const agentFilesArchiveCreditPayloadSchema = z.object({
    opId: filesOpId,
    credits: z.number().int().min(1).max(64)
});
export type AgentFilesArchiveCreditPayload = z.infer<typeof agentFilesArchiveCreditPayloadSchema>;

/** Stop a folder archive: the agent ends it with `files.archiveEnd` and an error. */
export const AGENT_FILES_ARCHIVE_CANCEL = 'files.archiveCancel' as const;
export const agentFilesArchiveCancelPayloadSchema = z.object({ opId: filesOpId });
export type AgentFilesArchiveCancelPayload = z.infer<typeof agentFilesArchiveCancelPayloadSchema>;

/**
 * CloudSync, serveur → agent. Le serveur orchestre tout : l'agent reçoit ses
 * assignations (`sync.config`), scanne sur ordre, transfère sur ordre.
 */

/** L'assignation d'un partage à cet appareil (dossier local + exclusions). */
export const syncShareAssignmentSchema = z.object({
    shareId: z.number().int().positive(),
    localPath: z.string().min(1).max(SYNC_STORAGE_PATH_MAX),
    /** `paused` = watcher coupé, scans refusés (pause partage OU appareil). */
    status: syncShareStatusSchema,
    exclusions: z.array(pathExclusionSchema),
    /**
     * Plafond de débit des MONTÉES, en octets/s ; `null` = illimité. Le
     * limiteur vit chez l'émetteur : l'agent pour les montées, le serveur pour
     * les descentes. C'est la seule façon de brider sans laisser gonfler des
     * tampons intermédiaires.
     */
    rateUpBps: z.number().int().positive().nullable().default(null),
    /** Rétention de `.deveye-trash/`, en jours. */
    trashKeepDays: z.number().int().positive().max(3650).default(30)
});
export type SyncShareAssignment = z.infer<typeof syncShareAssignmentSchema>;

/** Pousse la liste complète des assignations (à la connexion + à chaque changement). */
export const AGENT_SYNC_CONFIG = 'sync.config' as const;
export const agentSyncConfigPayloadSchema = z.object({
    shares: z.array(syncShareAssignmentSchema)
});
export type AgentSyncConfigPayload = z.infer<typeof agentSyncConfigPayloadSchema>;

/** Demande un scan du dossier local (répond en lots `sync.index`). */
export const AGENT_SYNC_SCAN = 'sync.scan' as const;
export const agentSyncScanPayloadSchema = z.object({
    sessionId: syncOpId,
    shareId: z.number().int().positive(),
    /**
     * Le défaut `full` rend un vieux serveur inoffensif : les deux sens de la
     * dissymétrie de version dégradent vers « scan complet », jamais vers
     * « saut ».
     */
    mode: syncScanModeSchema.default('full')
});
export type AgentSyncScanPayload = z.infer<typeof agentSyncScanPayloadSchema>;

/**
 * Demande l'upload d'un fichier local (répond en chunks `sync.chunk`).
 *
 * `startOffset` reprend un transfert interrompu : le serveur a conservé un
 * partiel vérifiable et ne redemande que ce qui manque. Le hash final reste le
 * juge de paix — une reprise incohérente est jetée, jamais installée.
 */
export const AGENT_SYNC_PUSH = 'sync.push' as const;
export const agentSyncPushPayloadSchema = z.object({
    opId: syncOpId,
    shareId: z.number().int().positive(),
    relPath: syncRelPath,
    startOffset: z.number().int().nonnegative().default(0)
});
export type AgentSyncPushPayload = z.infer<typeof agentSyncPushPayloadSchema>;

/**
 * Un chunk de download à installer. hash/size/mtime sont répétés sur chaque
 * frame (sans état) ; l'agent écrit dans un fichier temporaire, vérifie le
 * hash sur `done`, installe par rename atomique puis répond `sync.opResult`.
 * Chaque frame est acquittée (`sync.ack`) — le serveur borne les frames en vol.
 */
export const AGENT_SYNC_APPLY_CHUNK = 'sync.applyChunk' as const;
export const agentSyncApplyChunkPayloadSchema = z.object({
    opId: syncOpId,
    shareId: z.number().int().positive(),
    relPath: syncRelPath,
    seq: z.number().int().nonnegative(),
    /** Base64 des octets du chunk. */
    data: z.string().max(SYNC_CHUNK_MAX),
    done: z.boolean(),
    hash: sha256HexSchema,
    size: z.number().int().nonnegative(),
    /** Millisecondes unix, appliqué au fichier installé. */
    mtime: z.number().int().nonnegative(),
    /** Permissions Unix à réappliquer ; ignoré sous Windows, `null` = ne pas toucher. */
    mode: z.number().int().min(0).max(0o777).nullable().default(null),
    /**
     * Offset de clair à partir duquel CE transfert reprend. Décidé par le
     * serveur (d'après le `resumeFrom` de l'agent) et répété sur chaque frame :
     * l'agent tronque son temporaire à cette valeur avant d'écrire, et ne
     * présume jamais de son propre point de reprise.
     */
    resumeFrom: z.number().int().nonnegative().default(0)
});
export type AgentSyncApplyChunkPayload = z.infer<typeof agentSyncApplyChunkPayloadSchema>;

/**
 * Amorce un download. L'agent répond `sync.opResult` avec `op: 'applyReady'`
 * et un `resumeFrom` : les octets de clair qu'il détient DÉJÀ dans son
 * temporaire pour ce hash exact. Le temporaire est nommé par hash et non par
 * `opId` : un fichier modifié entre-temps a un autre hash, donc aucune reprise
 * sur des octets périmés.
 */
export const AGENT_SYNC_APPLY_START = 'sync.applyStart' as const;
export const agentSyncApplyStartPayloadSchema = z.object({
    opId: syncOpId,
    shareId: z.number().int().positive(),
    relPath: syncRelPath,
    hash: sha256HexSchema,
    size: z.number().int().nonnegative(),
    mtime: z.number().int().nonnegative(),
    mode: z.number().int().min(0).max(0o777).nullable().default(null)
});
export type AgentSyncApplyStartPayload = z.infer<typeof agentSyncApplyStartPayloadSchema>;

/**
 * Pose les métadonnées d'un chemin, sans qu'un octet ne transite. Deux usages :
 * créer un dossier VIDE de l'index, et appliquer un `chmod` seul sur un chemin
 * déjà en place (fichier comme dossier). L'agent ne crée le chemin que s'il
 * manque ; sinon il ne touche QUE le mode.
 */
export const AGENT_SYNC_APPLY_DIR = 'sync.applyDir' as const;
export const agentSyncApplyDirPayloadSchema = z.object({
    opId: syncOpId,
    shareId: z.number().int().positive(),
    relPath: syncRelPath,
    /**
     * `dir` autorise la CRÉATION du chemin ; `file` ne fait qu'ajuster le mode
     * s'il existe. Sans cette distinction, un `chmod` sur un fichier
     * momentanément absent ferait naître un DOSSIER à sa place.
     */
    kind: syncEntryKindSchema.default('dir'),
    mode: z.number().int().min(0).max(0o777).nullable().default(null)
});
export type AgentSyncApplyDirPayload = z.infer<typeof agentSyncApplyDirPayloadSchema>;

/**
 * Installe un contenu que l'appareil possède DÉJÀ ailleurs dans le partage
 * (renommage, déplacement, copie) : l'agent vérifie le hash de `sourceRelPath`
 * puis copie en local, sans qu'un octet ne transite par le réseau. En cas
 * d'échec il répond `opResult !ok` et le serveur retombe sur `sync.applyChunk`.
 */
export const AGENT_SYNC_APPLY_LOCAL = 'sync.applyLocal' as const;
export const agentSyncApplyLocalPayloadSchema = z.object({
    opId: syncOpId,
    shareId: z.number().int().positive(),
    relPath: syncRelPath,
    /** Chemin, dans le même partage, dont le contenu est déjà le bon. */
    sourceRelPath: syncRelPath,
    hash: sha256HexSchema,
    size: z.number().int().nonnegative(),
    mtime: z.number().int().nonnegative(),
    mode: z.number().int().min(0).max(0o777).nullable().default(null)
});
export type AgentSyncApplyLocalPayload = z.infer<typeof agentSyncApplyLocalPayloadSchema>;

/**
 * Propage un DÉPLACEMENT : l'agent renomme sur place, sans transfert ni
 * corbeille, après avoir vérifié que la source porte le contenu attendu. En
 * cas d'échec il répond `opResult !ok` et le serveur retombe sur le chemin
 * ordinaire (téléchargement puis suppression).
 */
export const AGENT_SYNC_MOVE = 'sync.move' as const;
export const agentSyncMovePayloadSchema = z.object({
    opId: syncOpId,
    shareId: z.number().int().positive(),
    /** Chemin actuel sur l'appareil. */
    fromRelPath: syncRelPath,
    /** Chemin cible. */
    relPath: syncRelPath,
    hash: sha256HexSchema,
    size: z.number().int().nonnegative(),
    mtime: z.number().int().nonnegative(),
    mode: z.number().int().min(0).max(0o777).nullable().default(null)
});
export type AgentSyncMovePayload = z.infer<typeof agentSyncMovePayloadSchema>;

/**
 * Propage une suppression : l'agent déplace le fichier vers sa corbeille locale
 * (`.deveye-trash/`) puis répond `sync.opResult`. N'est émis qu'une fois la
 * version archivée côté serveur — jamais de destruction sans sauvegarde.
 */
export const AGENT_SYNC_DELETE = 'sync.delete' as const;
export const agentSyncDeletePayloadSchema = z.object({
    opId: syncOpId,
    shareId: z.number().int().positive(),
    relPath: syncRelPath
});
export type AgentSyncDeletePayload = z.infer<typeof agentSyncDeletePayloadSchema>;

/** Collection config the server pushes to an agent (on connect + on change). */
export const agentConfigPayloadSchema = z.object({
    /**
     * The agent's single collection interval, in ms. One tick produces one
     * instant: graph signals *and* the process list, under one timestamp.
     */
    metricIntervalMs: z.number().int().positive(),
    /** How much of the process list to carry on each tick (`off`/`top`/`all`). */
    processCapture: processCaptureSchema,
    /**
     * Sentinelle est-elle active sur cet appareil ? Éteinte, l'agent ne relève
     * ni persistance ni authentification : une machine non surveillée ne doit
     * pas voir ses journaux lus « au cas où ». Facultatif : absent, l'agent ne
     * relève rien.
     */
    sentinelEnabled: z.boolean().optional(),
    /** Cadence du manifeste de persistance, en ms. */
    integrityIntervalMs: z.number().int().positive().optional(),
    /** Relever les issues d'authentification. Réglable à part : c'est la sonde la plus sensible. */
    authEventsEnabled: z.boolean().optional()
});

export type AgentConfigPayload = z.infer<typeof agentConfigPayloadSchema>;

export const agentServerMessageSchema = z.discriminatedUnion('command', [
    z.object({
        command: z.literal(AGENT_ACK),
        payload: z.object({ received: z.number().int().nonnegative() })
    }),
    z.object({
        command: z.literal(AGENT_ERROR),
        payload: ProtocolErrorSchema
    }),
    z.object({
        command: z.literal(AGENT_COLLECT),
        payload: z.object({})
    }),
    z.object({
        command: z.literal(AGENT_SCAN),
        payload: z.object({})
    }),
    z.object({
        command: z.literal(AGENT_CONFIG),
        payload: agentConfigPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_DESTROY),
        payload: z.object({})
    }),
    z.object({
        command: z.literal(AGENT_UPDATE),
        payload: agentUpdatePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_LIFECYCLE),
        payload: agentLifecyclePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SERVICE),
        payload: agentServicePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_PKG_LIST),
        payload: z.object({})
    }),
    z.object({
        command: z.literal(AGENT_PKG_UPGRADE),
        payload: agentPkgUpgradePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_DOCKER_INVENTORY),
        payload: z.object({})
    }),
    z.object({
        command: z.literal(AGENT_DOCKER_STATS),
        payload: z.object({})
    }),
    z.object({
        command: z.literal(AGENT_DOCKER_ACTION),
        payload: agentDockerActionPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_POWER),
        payload: agentPowerPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_LOG_SOURCES),
        payload: z.object({})
    }),
    z.object({
        command: z.literal(AGENT_LOG_QUERY),
        payload: agentLogQueryPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_TERM_OPEN),
        payload: agentTermOpenPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_TERM_INPUT),
        payload: agentTermInputPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_TERM_RESIZE),
        payload: agentTermResizePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_TERM_CLOSE),
        payload: agentTermClosePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_LIST),
        payload: agentFilesListPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_ANALYZE),
        payload: agentFilesAnalyzePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_SEARCH),
        payload: agentFilesSearchPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_MUTATE),
        payload: agentFilesMutatePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_DOWNLOAD),
        payload: agentFilesDownloadPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_UPLOAD),
        payload: agentFilesUploadPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_ARCHIVE),
        payload: agentFilesArchivePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_ARCHIVE_CREDIT),
        payload: agentFilesArchiveCreditPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_FILES_ARCHIVE_CANCEL),
        payload: agentFilesArchiveCancelPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SYNC_CONFIG),
        payload: agentSyncConfigPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SYNC_SCAN),
        payload: agentSyncScanPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SYNC_PUSH),
        payload: agentSyncPushPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SYNC_APPLY_CHUNK),
        payload: agentSyncApplyChunkPayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_SYNC_DELETE),
        payload: agentSyncDeletePayloadSchema
    }),
    z.object({
        command: z.literal(AGENT_TOKEN_ROTATE),
        payload: agentTokenRotatePayloadSchema
    })
]);

export type AgentServerMessage = z.infer<typeof agentServerMessageSchema>;

/**
 * Signature of a high-impact order, carried next to `command` and `payload` as
 * `sig`. Ed25519 over `command \n nonce \n issuedAt \n` followed by the exact
 * bytes of the payload as sent. The agent verifies it against the key pinned at
 * enrolment, refuses an `issuedAt` more than five minutes off, and refuses a
 * nonce it has already seen.
 */
export const orderSignatureSchema = z.object({
    nonce: z.string().length(32),
    issuedAt: z.number().int().positive(),
    signature: z.string().length(88)
});
export type OrderSignature = z.infer<typeof orderSignatureSchema>;

/**
 * The orders the server signs (`ORDER_SIGNING_KEY`) and the agent refuses
 * unsigned: what runs code, writes or deletes files, changes the agent's
 * privileges or its life, or drives its containers. Mirror of
 * `SIGNED_COMMANDS` in `agent/src/protocol.rs`.
 */
export const SIGNED_AGENT_COMMANDS: ReadonlySet<string> = new Set([
    AGENT_TERM_OPEN,
    AGENT_FILES_MUTATE,
    AGENT_FILES_UPLOAD,
    AGENT_SERVICE,
    AGENT_POWER,
    AGENT_DESTROY,
    AGENT_PKG_UPGRADE,
    AGENT_LIFECYCLE,
    AGENT_DOCKER_ACTION
]);

/**
 * Server -> web client push events (no requestId), carried in the standard
 * ServerMessage envelope. These constants name those unsolicited events.
 */
export const METRICS_PUSH_EVENT = 'metrics.push' as const;
export const DEVICE_PRESENCE_EVENT = 'device.presence' as const;
export const DEVICE_REPORT_EVENT = 'device.report' as const;
/** Package-manager inventory, live upgrade progress, and completion (Appareils panel). */
export const PACKAGE_LIST_EVENT = 'package.list' as const;
/**
 * Une mise à jour vient d'être acceptée pour ce gestionnaire. Émis par le
 * serveur avant la première ligne de sortie de l'outil, pour que tous les
 * écrans ouverts grisent le bouton au même instant.
 */
export const PACKAGE_STARTED_EVENT = 'package.started' as const;
export const PACKAGE_PROGRESS_EVENT = 'package.progress' as const;
export const PACKAGE_DONE_EVENT = 'package.done' as const;
/** Outcome of a system power action (shutdown/reboot/suspend…), fanned to subscribers. */
export const DEVICE_POWER_EVENT = 'device.powerResult' as const;
/**
 * Outcome of a persistence/privilege change (autostart, elevate, drop), fanned to
 * subscribers exactly like the power result.
 */
export const DEVICE_SERVICE_EVENT = 'device.serviceResult' as const;
/** Container inventory, live stats sample, and action progress/outcome. */
export const DEVICE_DOCKER_INVENTORY_EVENT = 'device.dockerInventory' as const;
export const DEVICE_DOCKER_STATS_EVENT = 'device.dockerStats' as const;
export const DEVICE_DOCKER_PROGRESS_EVENT = 'device.dockerProgress' as const;
export const DEVICE_DOCKER_DONE_EVENT = 'device.dockerDone' as const;
/** Device log sources inventory + queried log lines, fanned to subscribers. */
export const DEVICE_LOG_SOURCES_EVENT = 'device.logSources' as const;
export const DEVICE_LOG_LINES_EVENT = 'device.logLines' as const;
/** Terminal session PTY output + session-end, fanned to subscribers. */
export const DEVICE_TERM_OUTPUT_EVENT = 'device.termOutput' as const;
export const DEVICE_TERM_EXIT_EVENT = 'device.termExit' as const;
/** File explorer results (listing, usage, search hits, mutation outcome). */
export const DEVICE_FILES_LISTING_EVENT = 'device.filesListing' as const;
export const DEVICE_FILES_USAGE_EVENT = 'device.filesUsage' as const;
export const DEVICE_FILES_MATCHES_EVENT = 'device.filesMatches' as const;
export const DEVICE_FILES_OP_EVENT = 'device.filesOp' as const;
export const DEVICE_FILES_CHUNK_EVENT = 'device.filesChunk' as const;
/** CloudSync : progression de session, état agrégé d'un partage, et chunks de téléchargement. */
export const CLOUD_SYNC_PROGRESS_EVENT = 'cloudSync.progress' as const;
export const CLOUD_SYNC_STATE_EVENT = 'cloudSync.state' as const;
export const CLOUD_SYNC_CHUNK_EVENT = 'cloudSync.chunk' as const;

// Push payloads reuse the agent reply shapes (they already carry `deviceId`).

/**
 * L'inventaire des gestionnaires, enrichi par le serveur de ce que l'agent ne
 * peut pas savoir : quelles mises à jour tournent déjà. Sans ce champ, un
 * écran ouvert pendant une mise à jour permettrait de relancer la même
 * commande.
 */
export const packageListPushSchema = agentPkgListResultPayloadSchema.extend({
    running: z.array(packageManagerIdSchema).default([])
});

export const packageStartedPushSchema = z.object({
    deviceId: z.uuid(),
    manager: packageManagerIdSchema
});
export const packageProgressPushSchema = agentPkgProgressPayloadSchema;
export const packageDonePushSchema = agentPkgDonePayloadSchema;
export const devicePowerPushSchema = agentPowerResultPayloadSchema;
export const deviceServicePushSchema = agentServiceResultPayloadSchema;
/**
 * L'inventaire, enrichi par le serveur de ce que l'agent ignore : l'action
 * longue déjà en cours sur cet appareil. Sans ce champ, un second écran
 * relancerait le même `prune`.
 */
export const deviceDockerInventoryPushSchema = agentDockerInventoryResultPayloadSchema.extend({
    running: z.string().max(64).nullable().default(null)
});
export const deviceDockerStatsPushSchema = agentDockerStatsResultPayloadSchema;
export const deviceDockerProgressPushSchema = agentDockerProgressPayloadSchema;
export const deviceDockerDonePushSchema = agentDockerDonePayloadSchema;
export const deviceLogSourcesPushSchema = agentLogSourcesResultPayloadSchema;
export const deviceLogLinesPushSchema = agentLogLinesPayloadSchema;
export const deviceTermOutputPushSchema = agentTermOutputPayloadSchema;
export const deviceTermExitPushSchema = agentTermExitPayloadSchema;
export const deviceFilesListingPushSchema = agentFilesListingPayloadSchema;
export const deviceFilesUsagePushSchema = agentFilesUsagePayloadSchema;
export const deviceFilesMatchesPushSchema = agentFilesMatchesPayloadSchema;
export const deviceFilesOpPushSchema = agentFilesOpResultPayloadSchema;
export const deviceFilesChunkPushSchema = agentFilesChunkPayloadSchema;

/** Push CloudSync : abonnement par partage (pas par appareil). */
export const cloudSyncProgressPushSchema = cloudSyncProgressSchema;
export const cloudSyncStatePushSchema = cloudSyncShareStateSchema;
export const cloudSyncChunkPushSchema = z.object({
    opId: z.string().max(64),
    /** Base64 des octets du chunk (vide autorisé sur la frame terminale). */
    data: z.string().max(SYNC_CHUNK_MAX),
    done: z.boolean(),
    error: z.string().max(500).optional()
});

export type CloudSyncProgressPush = z.infer<typeof cloudSyncProgressPushSchema>;
export type CloudSyncStatePush = z.infer<typeof cloudSyncStatePushSchema>;
export type CloudSyncChunkPush = z.infer<typeof cloudSyncChunkPushSchema>;

export type DeviceDockerInventoryPush = z.infer<typeof deviceDockerInventoryPushSchema>;
export type DeviceDockerStatsPush = z.infer<typeof deviceDockerStatsPushSchema>;
export type DeviceDockerProgressPush = z.infer<typeof deviceDockerProgressPushSchema>;
export type DeviceDockerDonePush = z.infer<typeof deviceDockerDonePushSchema>;

export type PackageListPush = z.infer<typeof packageListPushSchema>;
export type PackageStartedPush = z.infer<typeof packageStartedPushSchema>;
export type PackageProgressPush = z.infer<typeof packageProgressPushSchema>;
export type PackageDonePush = z.infer<typeof packageDonePushSchema>;
export type DevicePowerPush = z.infer<typeof devicePowerPushSchema>;
export type DeviceServicePush = z.infer<typeof deviceServicePushSchema>;
export type DeviceLogSourcesPush = z.infer<typeof deviceLogSourcesPushSchema>;
export type DeviceLogLinesPush = z.infer<typeof deviceLogLinesPushSchema>;
export type DeviceTermOutputPush = z.infer<typeof deviceTermOutputPushSchema>;
export type DeviceTermExitPush = z.infer<typeof deviceTermExitPushSchema>;
export type DeviceFilesListingPush = z.infer<typeof deviceFilesListingPushSchema>;
export type DeviceFilesUsagePush = z.infer<typeof deviceFilesUsagePushSchema>;
export type DeviceFilesMatchesPush = z.infer<typeof deviceFilesMatchesPushSchema>;
export type DeviceFilesOpPush = z.infer<typeof deviceFilesOpPushSchema>;
export type DeviceFilesChunkPush = z.infer<typeof deviceFilesChunkPushSchema>;

export const metricsPushSchema = z.object({
    deviceId: z.uuid(),
    snapshot: metricSnapshotSchema
});

export type MetricsPush = z.infer<typeof metricsPushSchema>;

export const deviceReportPushSchema = z.object({
    deviceId: z.uuid(),
    report: deviceReportSchema
});

export type DeviceReportPush = z.infer<typeof deviceReportPushSchema>;

export const devicePresenceSchema = z.object({
    deviceId: z.uuid(),
    online: z.boolean(),
    lastSeen: z.number().int().nonnegative().nullable()
});

export type DevicePresence = z.infer<typeof devicePresenceSchema>;
