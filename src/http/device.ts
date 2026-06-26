import { z } from 'zod';
import { devicePlatformSchema, deviceSchema } from '../domain/device';

/**
 * Device linking & enrollment (HTTP, distinct from the user feature protocol).
 *
 * Flow:
 *  1. A logged-in user requests a short-lived link code (web UI).
 *  2. The agent posts the code + machine fingerprint + public key to enroll.
 *  3. The server creates a `pending` device and returns a device token (JWT).
 *  4. The user confirms the device in the Clients page to activate it.
 */

/** Hard cap on a custom code lifetime (30 days), to bound never-pruned rows. */
export const LINK_CODE_TTL_MAX_SECONDS = 30 * 24 * 60 * 60;

/**
 * Request a new link code. `ttlSeconds`:
 *  - omitted   → server default lifetime,
 *  - `null`    → no expiry (valid until used or deleted),
 *  - a number  → custom lifetime in seconds.
 */
export const linkCodeRequestSchema = z.object({
    ttlSeconds: z.number().int().positive().max(LINK_CODE_TTL_MAX_SECONDS).nullable().optional(),
    /**
     * Approve the device automatically the moment it enrols with this code,
     * instead of leaving it `pending` for manual approval. Defaults to `false`
     * (manual approval stays the safe default).
     */
    autoApprove: z.boolean().default(false)
});

export type LinkCodeRequest = z.infer<typeof linkCodeRequestSchema>;

export const linkCodeResponseSchema = z.object({
    /** Short human-typable code (e.g. shown in the UI, entered on the agent). */
    code: z.string().min(6).max(32),
    /** Unix seconds when the code expires; `null` means it never expires. */
    expiresAt: z.number().int().positive().nullable(),
    /** Whether a device enrolling with this code is approved automatically. */
    autoApprove: z.boolean()
});

export type LinkCodeResponse = z.infer<typeof linkCodeResponseSchema>;

/** Toggle the auto-approval of an existing (still-active) link code. */
export const linkCodeUpdateSchema = z.object({
    autoApprove: z.boolean()
});

export type LinkCodeUpdate = z.infer<typeof linkCodeUpdateSchema>;

/** Currently-active (unconsumed, unexpired) link codes for the caller. */
export const linkCodesListResponseSchema = z.object({
    codes: z.array(linkCodeResponseSchema)
});

export type LinkCodesListResponse = z.infer<typeof linkCodesListResponseSchema>;

export const enrollDeviceRequestSchema = z.object({
    code: z.string().min(6).max(32),
    name: z.string().min(1).max(128),
    fingerprint: z.string().min(1).max(128),
    platform: devicePlatformSchema.default('linux'),
    /** X25519 public key (base64) for command signature verification. */
    publicKey: z.string().min(1).max(256)
});

export type EnrollDeviceRequest = z.infer<typeof enrollDeviceRequestSchema>;

export const enrollDeviceResponseSchema = z.object({
    deviceId: z.uuid(),
    /** Long-lived device token (JWT). Stored only on the agent. */
    deviceToken: z.string().min(1),
    device: deviceSchema
});

export type EnrollDeviceResponse = z.infer<typeof enrollDeviceResponseSchema>;

/**
 * Agent download matrix — the **single source of truth** for the set of
 * platform binaries shipped with a release. Consumed by:
 *  - the web UI (the "Télécharger l'agent" two-step picker), and
 *  - the server (validates the `:target` param and resolves the file on disk).
 *
 * The CI release workflow and `agent/build-all.sh` mirror the same labels (they
 * can't import TS) — keep all three in sync when adding/removing a target.
 */
export const agentTargetSchema = z.enum([
    'linux-x86_64',
    'linux-aarch64',
    'linux-armv7',
    'macos-x86_64',
    'macos-arm64',
    'windows-x86_64',
    'windows-x86',
    'windows-arm64'
]);

export type AgentTarget = z.infer<typeof agentTargetSchema>;

/** Coarse OS family, used to group targets in the picker (Apple / Linux / Windows). */
export type AgentOs = 'linux' | 'macos' | 'windows';

export interface AgentTargetMeta {
    /** Stable id used in the URL and as the download key. */
    id: AgentTarget;
    /** OS family the target belongs to (drives the first picker step). */
    os: AgentOs;
    /** Human-readable architecture label (shown in the second picker step). */
    label: string;
    /** Asset/file name served from `AGENT_DIST_DIR` (Windows carries `.exe`). */
    filename: string;
}

/** Ordered metadata for every shippable target (drives the picker + file lookup). */
export const AGENT_TARGETS: readonly AgentTargetMeta[] = [
    {
        id: 'macos-arm64',
        os: 'macos',
        label: 'Apple Silicon',
        filename: 'deveye-agent-macos-arm64'
    },
    {
        id: 'macos-x86_64',
        os: 'macos',
        label: 'Apple Intel',
        filename: 'deveye-agent-macos-x86_64'
    },
    { id: 'linux-x86_64', os: 'linux', label: 'Linux x64', filename: 'deveye-agent-linux-x86_64' },
    {
        id: 'linux-aarch64',
        os: 'linux',
        label: 'Linux ARM64',
        filename: 'deveye-agent-linux-aarch64'
    },
    {
        id: 'linux-armv7',
        os: 'linux',
        label: 'Linux ARM 32-bit (Raspberry Pi)',
        filename: 'deveye-agent-linux-armv7'
    },
    {
        id: 'windows-x86_64',
        os: 'windows',
        label: 'Windows x64',
        filename: 'deveye-agent-windows-x86_64.exe'
    },
    {
        id: 'windows-x86',
        os: 'windows',
        label: 'Windows x86 (32-bit)',
        filename: 'deveye-agent-windows-x86.exe'
    },
    {
        id: 'windows-arm64',
        os: 'windows',
        label: 'Windows ARM64',
        filename: 'deveye-agent-windows-arm64.exe'
    }
];

/** One target's availability, as reported by `GET /api/agent/targets`. */
export const agentTargetStatusSchema = z.object({
    id: agentTargetSchema,
    os: z.enum(['linux', 'macos', 'windows']),
    label: z.string(),
    /** Whether the binary is present on the server (greys it out in the UI). */
    available: z.boolean(),
    /** Size in bytes when available, else `null`. */
    sizeBytes: z.number().int().nonnegative().nullable()
});

export type AgentTargetStatus = z.infer<typeof agentTargetStatusSchema>;

export const agentTargetsResponseSchema = z.object({
    /**
     * DevEye version the served binaries were built from (from the synced
     * manifest), or `null` if nothing has been synced yet. The UI warns when it
     * differs from its own build version (`__APP_VERSION__`).
     */
    agentVersion: z.string().nullable(),
    targets: z.array(agentTargetStatusSchema)
});

export type AgentTargetsResponse = z.infer<typeof agentTargetsResponseSchema>;

/**
 * Manifest published alongside the agent binaries on the rolling release. It is
 * the contract between the CI build and the server's boot-time reconciler: the
 * server compares each target's `sha256` to what's on disk and downloads only
 * the diff. `version` is the DevEye version the binaries were built from.
 */
export const agentManifestTargetSchema = z.object({
    id: agentTargetSchema,
    filename: z.string(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    size: z.number().int().nonnegative(),
    /**
     * Base64 ed25519 signature over the 32 raw bytes of `sha256`, produced by the
     * CI release with the dedicated update-signing key. The agent verifies it with
     * its embedded public key before self-replacing. **Optional**: a target with no
     * signature stays manually downloadable but can never drive a self-update — so a
     * pre-signing build degrades cleanly instead of being rejected outright.
     */
    signature: z.string().min(1).optional()
});

export type AgentManifestTarget = z.infer<typeof agentManifestTargetSchema>;

export const agentManifestSchema = z.object({
    version: z.string(),
    targets: z.array(agentManifestTargetSchema)
});

export type AgentManifest = z.infer<typeof agentManifestSchema>;
