import { z } from 'zod';
import { metricsBatchSchema, metricSnapshotSchema } from '../domain/metrics';
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
