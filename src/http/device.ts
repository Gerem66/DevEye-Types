import { z } from 'zod';
import { devicePlatformSchema, deviceSchema } from '../domain/device';

/**
 * Device linking & enrollment (HTTP, distinct from the user feature protocol).
 *
 * Flow:
 *  1. A member holding `devices: write` issues a short-lived link code for the
 *     active workspace.
 *  2. The agent posts the code and its machine fingerprint to enroll.
 *  3. A fingerprint new to the workspace is enrolled `active`, once the plan
 *     allows one more device (checked before the code is consumed). A known
 *     fingerprint takes over that device record: a fresh token replaces the
 *     old one and the device waits, `pending`, for someone to approve it.
 */

/** Hard cap on a code lifetime (one hour). A link code is a key to the workspace. */
export const LINK_CODE_TTL_MAX_SECONDS = 60 * 60;

/**
 * Request a new link code. `ttlSeconds` omitted → server default lifetime,
 * otherwise a lifetime in seconds.
 */
export const linkCodeRequestSchema = z.object({
    ttlSeconds: z.number().int().positive().max(LINK_CODE_TTL_MAX_SECONDS).optional()
});

export type LinkCodeRequest = z.infer<typeof linkCodeRequestSchema>;

export const linkCodeResponseSchema = z.object({
    /** Short human-typable code (e.g. shown in the UI, entered on the agent). */
    code: z.string().min(6).max(32),
    /** Unix seconds when the code expires. */
    expiresAt: z.number().int().positive()
});

export type LinkCodeResponse = z.infer<typeof linkCodeResponseSchema>;

/** The workspace's link codes still usable (unconsumed, unexpired). */
export const linkCodesListResponseSchema = z.object({
    codes: z.array(linkCodeResponseSchema)
});

export type LinkCodesListResponse = z.infer<typeof linkCodesListResponseSchema>;

export const enrollDeviceRequestSchema = z.object({
    code: z.string().min(6).max(32),
    name: z.string().min(1).max(128),
    fingerprint: z.string().min(1).max(128),
    platform: devicePlatformSchema.default('linux')
});

export type EnrollDeviceRequest = z.infer<typeof enrollDeviceRequestSchema>;

export const enrollDeviceResponseSchema = z.object({
    deviceId: z.uuid(),
    /** Device token (JWT), rotated by the server before it expires. Stored only on the agent. */
    deviceToken: z.string().min(1),
    /**
     * The server's order-signing public key (Ed25519, base64): the agent pins it
     * and refuses any high-impact order that does not carry its signature.
     */
    orderSigningKey: z.string().length(44),
    device: deviceSchema
});

export type EnrollDeviceResponse = z.infer<typeof enrollDeviceResponseSchema>;

/**
 * Agent download matrix: the single source of truth for the platform binaries
 * shipped with a release, consumed by the web UI picker and the server
 * (`:target` validation, file lookup). The CI release workflow and
 * `agent/build-all.sh` mirror the same labels: keep all three in sync when
 * adding or removing a target.
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
     * Base64 ed25519 signature over the 32 raw bytes of `sha256`, made by the CI
     * release with the update-signing key; the agent verifies it with its
     * embedded public key before self-replacing. Optional: an unsigned target
     * stays downloadable but can never drive a self-update.
     */
    signature: z.string().min(1).optional()
});

export type AgentManifestTarget = z.infer<typeof agentManifestTargetSchema>;

export const agentManifestSchema = z.object({
    version: z.string(),
    targets: z.array(agentManifestTargetSchema)
});

export type AgentManifest = z.infer<typeof agentManifestSchema>;
