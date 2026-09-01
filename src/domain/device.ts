import { z } from 'zod';
import { deviceReportSchema, processCaptureSchema } from './report';

/**
 * Lifecycle of a monitored machine (the Rust agent):
 * - `pending`:          enrolled via a link code but not yet confirmed in the UI.
 * - `active`:           confirmed; allowed to push metrics.
 * - `revoked`:          access withdrawn; the agent is rejected (can be reactivated).
 * - `pending_deletion`: deletion requested; on its next connection the agent is
 *                       told to self-destruct, then the device is archived. Can
 *                       be cancelled until the agent reconnects.
 * - `archived`:         agent destroyed/removed; the device no longer exists for
 *                       management, but its monitoring history is kept frozen and
 *                       remains browsable (read-only) until explicitly purged.
 */
export const deviceStatusSchema = z.enum([
    'pending',
    'active',
    'revoked',
    'pending_deletion',
    'archived'
]);
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;

export const devicePlatformSchema = z.enum(['linux', 'macos', 'windows']);
export type DevicePlatform = z.infer<typeof devicePlatformSchema>;

/**
 * OS account a terminal session opens under. Restricted to safe username
 * characters (no shell metacharacters), since it reaches a `su` on the device.
 */
export const terminalUser = z
    .string()
    .regex(/^[A-Za-z0-9._-]+$/, 'Nom d’utilisateur invalide')
    .max(32);

/**
 * Client-facing device. Secrets (token hash, public key) are never exposed.
 * `online` is live presence, derived from an active agent connection.
 */
export const deviceSchema = z.object({
    id: z.uuid(),
    ownerId: z.number().int().nonnegative(),
    name: z.string().min(1).max(128),
    fingerprint: z.string().min(1).max(128),
    platform: devicePlatformSchema,
    status: deviceStatusSchema,
    online: z.boolean(),
    lastSeen: z.number().int().nonnegative().nullable(),
    created: z.number().int().nonnegative(),
    /**
     * Version the running agent reported on its last connection (`agent.hello`);
     * null until it has connected at least once.
     */
    agentVersion: z.string().nullable().default(null),
    /**
     * Version the server can update this agent to (the served/synced binary set),
     * or null when nothing is synced. Server-computed, not stored.
     */
    latestAgentVersion: z.string().nullable().default(null),
    /**
     * True when a newer, *signed* binary exists for this device's build target and
     * the running agent differs from it — i.e. the UI can offer "Mettre à jour".
     * Server-computed from the synced manifest, not stored.
     */
    agentUpdateAvailable: z.boolean().default(false),
    /** Latest known health/security report; null until the agent sends one. */
    report: deviceReportSchema.nullable().default(null),
    /**
     * The agent's single collection interval in seconds — one tick yields
     * metrics *and* processes under one timestamp. Null → server default (60).
     */
    metricIntervalSeconds: z.number().int().positive().nullable().default(null),
    /** How much of the process list each tick carries; null → server default (`all`). */
    processCapture: processCaptureSchema.nullable().default(null),
    /**
     * History retention in days — one duration for the whole instant: metrics,
     * presence *and* processes expire together. Null → server default.
     */
    retentionDays: z.number().int().positive().nullable().default(null),
    /**
     * Account new terminal sessions open under (`su -l`); null → the account the
     * agent itself runs as.
     */
    terminalDefaultUser: terminalUser.nullable().default(null),
    /**
     * On shell exit: `true` closes the terminal straight away, `false` keeps it
     * open with a "Relancer"/"Fermer" banner.
     */
    terminalCloseOnExit: z.boolean().default(true),
    /**
     * Seen from a workspace it was projected into, not the one it was paired
     * in: read-only marks and a "shared" badge hang on it.
     */
    foreign: z.boolean().default(false),
    /**
     * Last self-destruct failure message: set when an agent failed to wipe itself
     * during deletion, so the UI can surface it and the deletion is aborted.
     * Null when there's no pending error.
     */
    deleteError: z.string().nullable().default(null)
});

export type Device = z.infer<typeof deviceSchema>;

/**
 * Database row shape (server-only). Mirrors columns exactly.
 */
export interface DeviceRow {
    id: string;
    owner_id: number;
    /**
     * Le domicile de l'appareil, celui du code de liaison : il porte l'unicité
     * de l'empreinte (`uniq_workspace_fingerprint`), sert le ré-enrôlement par
     * la route publique, et c'est depuis lui que l'appareil se projette
     * ailleurs (`item_shares`).
     */
    workspace_id: number;
    name: string;
    fingerprint: string;
    platform: string;
    status: DeviceStatus;
    /** X25519 public key (base64) used for command signature verification. */
    public_key: string | null;
    /** SHA-256 hash of the device token (the raw token lives only on the agent). */
    token_hash: string;
    last_seen: number | null;
    created: number;
    /** Agent version from the last `agent.hello`; null until first connection. */
    agent_version: string | null;
    /** Build target the agent reported (`linux-x86_64`…); null until first hello. */
    agent_target: string | null;
    /** JSON-encoded latest `DeviceReport`, or null if none received yet. */
    report_json: string | null;
    /** Collection interval in seconds (metrics + processes); null → server default. */
    metric_interval_seconds: number | null;
    /** Process capture mode (`off`|`top`|`all`); null → server default. */
    process_capture: string | null;
    /** History retention in days (metrics, presence, processes); null → server default. */
    retention_days: number | null;
    /** Account terminal sessions open under; null → the agent's own account. */
    terminal_default_user: string | null;
    /** 1 = closing the shell closes the terminal, 0 = it stays open on a banner. */
    terminal_close_on_exit: number;
    /** Status to restore if a pending deletion is cancelled; null otherwise. */
    status_before_delete: string | null;
    /** Last self-destruct failure message (deletion aborted); null otherwise. */
    delete_error: string | null;
    /** Rang chez lui ; celui des espaces qui ne font que le voir vit dans `item_shares`. */
    sort_order: number;
}

/**
 * Réglages appliqués à un appareil qui n'a rien choisi. Source unique : le
 * serveur les applique en construisant la config poussée à l'agent, et le
 * dialogue de configuration les affiche comme valeurs de départ.
 */
export const DEFAULT_METRIC_INTERVAL_SECONDS = 60;
export const DEFAULT_PROCESS_CAPTURE = 'all' as const;
export const DEFAULT_RETENTION_DAYS = 30;
