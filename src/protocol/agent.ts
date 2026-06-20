import { z } from 'zod';
import { metricsBatchSchema, metricSnapshotSchema } from '../domain/metrics';
import { deviceReportSchema } from '../domain/report';
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

export const agentReportMessagePayloadSchema = z.object({
    deviceId: z.string().uuid(),
    report: deviceReportSchema
});

export const agentClientMessageSchema = z.discriminatedUnion('command', [
    z.object({
        command: z.literal(AGENT_HELLO),
        payload: z.object({ agentVersion: z.string().min(1) })
    }),
    z.object({
        command: z.literal(AGENT_METRICS_BATCH),
        payload: metricsBatchSchema
    }),
    z.object({
        command: z.literal(AGENT_REPORT),
        payload: agentReportMessagePayloadSchema
    })
]);

export type AgentClientMessage = z.infer<typeof agentClientMessageSchema>;

/** Command names the server may send to the agent. */
export const AGENT_ACK = 'agent.ack' as const;
export const AGENT_ERROR = 'agent.error' as const;
/** Ask the agent to collect and push a fresh sample + report immediately. */
export const AGENT_COLLECT = 'agent.collect' as const;

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
    deviceId: z.string().uuid(),
    snapshot: metricSnapshotSchema
});

export type MetricsPush = z.infer<typeof metricsPushSchema>;

export const deviceReportPushSchema = z.object({
    deviceId: z.string().uuid(),
    report: deviceReportSchema
});

export type DeviceReportPush = z.infer<typeof deviceReportPushSchema>;

export const devicePresenceSchema = z.object({
    deviceId: z.string().uuid(),
    online: z.boolean(),
    lastSeen: z.number().int().nonnegative().nullable()
});

export type DevicePresence = z.infer<typeof devicePresenceSchema>;
