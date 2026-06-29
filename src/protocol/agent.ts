import { z } from 'zod';
import {
    fileListingSchema,
    fileMatchSchema,
    fileMutateOpSchema,
    fileSearchFilterSchema,
    fileUsageEntrySchema
} from '../domain/deviceFiles';
import {
    deviceLogFilterSchema,
    deviceLogLineSchema,
    deviceLogSourceSchema
} from '../domain/deviceLogs';
import { metricsBatchSchema, metricSnapshotSchema } from '../domain/metrics';
import { packageManagerIdSchema, packageManagerSchema } from '../domain/packages';
import { deviceReportSchema, processCaptureSchema, processSampleSchema } from '../domain/report';
import { agentTargetSchema } from '../http/device';
import { ProtocolErrorSchema } from './error';

/**
 * Agent <-> Server wire protocol (distinct from the user feature protocol).
 *
 * The agent authenticates with its device token, then streams metric batches.
 * The server acknowledges and may push commands (reserved for later).
 */

/** Command names the agent may send to the server. */
export const AGENT_METRICS_BATCH = 'metrics.batch' as const;
export const AGENT_HELLO = 'agent.hello' as const;
export const AGENT_REPORT = 'agent.report' as const;
export const AGENT_PROCESSES = 'agent.processes' as const;
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

export const agentReportMessagePayloadSchema = z.object({
    deviceId: z.uuid(),
    report: deviceReportSchema
});

export const agentProcessesMessagePayloadSchema = z.object({
    deviceId: z.uuid(),
    sample: processSampleSchema
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
        command: z.literal(AGENT_PROCESSES),
        payload: agentProcessesMessagePayloadSchema
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
    })
]);

export type AgentClientMessage = z.infer<typeof agentClientMessageSchema>;

/** Command names the server may send to the agent. */
export const AGENT_ACK = 'agent.ack' as const;
export const AGENT_ERROR = 'agent.error' as const;
/** Ask the agent to collect and push a fresh sample + report immediately. */
export const AGENT_COLLECT = 'agent.collect' as const;
/** Push the per-device collection config (cadences + capture mode) to the agent. */
export const AGENT_CONFIG = 'agent.config' as const;
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
    limit: z.number().int().positive().optional()
});
export type AgentLogQueryPayload = z.infer<typeof agentLogQueryPayloadSchema>;

const terminalCols = z.number().int().min(1).max(2000);
const terminalRows = z.number().int().min(1).max(2000);

/** Open an interactive PTY session running the agent user's shell. */
export const AGENT_TERM_OPEN = 'term.open' as const;
export const agentTermOpenPayloadSchema = z.object({
    sessionId: z.string().max(64),
    cols: terminalCols,
    rows: terminalRows
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

/** Collection config the server pushes to an agent (on connect + on change). */
export const agentConfigPayloadSchema = z.object({
    /** Light metric (graph) sampling interval in ms. */
    metricIntervalMs: z.number().int().positive(),
    /** Heavy snapshot (process capture) interval in ms. */
    snapshotIntervalMs: z.number().int().positive(),
    processCapture: processCaptureSchema
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
    })
]);

export type AgentServerMessage = z.infer<typeof agentServerMessageSchema>;

/**
 * Server -> web client push events (no requestId), carried in the standard
 * ServerMessage envelope. These constants name those unsolicited events.
 */
export const METRICS_PUSH_EVENT = 'metrics.push' as const;
export const DEVICE_PRESENCE_EVENT = 'device.presence' as const;
export const DEVICE_REPORT_EVENT = 'device.report' as const;
/** Package-manager inventory, live upgrade progress, and completion (Appareils panel). */
export const PACKAGE_LIST_EVENT = 'package.list' as const;
export const PACKAGE_PROGRESS_EVENT = 'package.progress' as const;
export const PACKAGE_DONE_EVENT = 'package.done' as const;
/** Outcome of a system power action (shutdown/reboot/suspend…), fanned to subscribers. */
export const DEVICE_POWER_EVENT = 'device.powerResult' as const;
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

/** Push payloads reuse the agent reply shapes (already carry `deviceId`). */
export const packageListPushSchema = agentPkgListResultPayloadSchema;
export const packageProgressPushSchema = agentPkgProgressPayloadSchema;
export const packageDonePushSchema = agentPkgDonePayloadSchema;
export const devicePowerPushSchema = agentPowerResultPayloadSchema;
export const deviceLogSourcesPushSchema = agentLogSourcesResultPayloadSchema;
export const deviceLogLinesPushSchema = agentLogLinesPayloadSchema;
export const deviceTermOutputPushSchema = agentTermOutputPayloadSchema;
export const deviceTermExitPushSchema = agentTermExitPayloadSchema;
export const deviceFilesListingPushSchema = agentFilesListingPayloadSchema;
export const deviceFilesUsagePushSchema = agentFilesUsagePayloadSchema;
export const deviceFilesMatchesPushSchema = agentFilesMatchesPayloadSchema;
export const deviceFilesOpPushSchema = agentFilesOpResultPayloadSchema;
export const deviceFilesChunkPushSchema = agentFilesChunkPayloadSchema;

export type PackageListPush = z.infer<typeof packageListPushSchema>;
export type PackageProgressPush = z.infer<typeof packageProgressPushSchema>;
export type PackageDonePush = z.infer<typeof packageDonePushSchema>;
export type DevicePowerPush = z.infer<typeof devicePowerPushSchema>;
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
