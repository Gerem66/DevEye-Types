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
     * Workspaces this device is shared with. A device is reachable from every
     * workspace listed here; its pairing workspace is always among them.
     */
    workspaceIds: z.array(z.number().int().positive()).default([]),
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
     * Espace d'**appairage** : celui que visait le code de liaison. Il porte
     * l'unicité de l'empreinte (`uniq_workspace_fingerprint`) et sert le
     * ré-enrôlement depuis la route publique, qui n'a pas de session pour dire
     * autrement d'où elle vient.
     *
     * Ce n'est plus la frontière d'accès : celle-ci est la table de jonction
     * `device_workspaces`, un appareil pouvant être partagé avec plusieurs
     * espaces. L'espace d'appairage y figure toujours et ne s'en retire pas.
     *
     * `null` quand cet espace a été supprimé : l'appareil survit — il perd son
     * origine, pas son existence — et reste joignable par les espaces avec
     * lesquels il est partagé.
     */
    workspace_id: number | null;
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
    /** Status to restore if a pending deletion is cancelled; null otherwise. */
    status_before_delete: string | null;
    /** Last self-destruct failure message (deletion aborted); null otherwise. */
    delete_error: string | null;
    /**
     * Sentinelle est-elle active sur cet appareil ? Éteinte par défaut : activer
     * la feature ne doit lire les journaux d'authentification de personne, c'est
     * un geste explicite appareil par appareil.
     */
    sentinel_enabled: number;
    /**
     * Fin de la fenêtre d'apprentissage, unix ms. `null` tant que Sentinelle n'a
     * jamais été activée ; une date passée signifie « apprentissage terminé ».
     */
    sentinel_learning_until: number | null;
    /** Cadence du manifeste de persistance, en minutes. */
    sentinel_integrity_minutes: number;
    /** Relever les issues d'authentification (interrupteur propre). */
    sentinel_auth_events: number;
    /** Unix ms du dernier manifeste reçu ; `null` = jamais mesuré. */
    sentinel_last_integrity_at: number | null;
}

/**
 * Un appareil rangé dans un espace (`device_workspaces`). Le rang est porté par
 * la jonction et non par l'appareil : le même appareil est rangé
 * indépendamment dans chaque espace qui y a accès.
 */
export interface DeviceWorkspaceRow {
    device_id: string;
    workspace_id: number;
    /** Rank in *that* workspace's list, entirely the user's (`device.reorder`). */
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
