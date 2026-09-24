import { z } from 'zod';

/**
 * Container management on a device — entities shared by the agent, server and
 * client.
 *
 * The agent drives the engines through their CLI (`docker` / `podman`), the way
 * it already reads container logs: no daemon socket, no `bollard`, and podman
 * support comes free because both take the same flags. Go templates rather than
 * `--format json`: the JSON field names diverge between the two engines, the
 * templates do not.
 */

/** A container engine the agent found on the host. */
export const containerEngineSchema = z.enum(['docker', 'podman']);
export type ContainerEngine = z.infer<typeof containerEngineSchema>;

/**
 * Normalised container state. `unknown` covers whatever an engine prints that
 * we do not model, so an unexpected word never drops the container from the
 * inventory.
 */
export const containerStateSchema = z.enum([
    'running',
    'exited',
    'paused',
    'created',
    'restarting',
    'removing',
    'dead',
    'unknown'
]);
export type ContainerState = z.infer<typeof containerStateSchema>;

/** One container, running or not. */
export const dockerContainerSchema = z.object({
    engine: containerEngineSchema,
    /** Full (untruncated) container id — what every action addresses. */
    id: z.string().min(1).max(128),
    name: z.string().max(256),
    image: z.string().max(512),
    state: containerStateSchema,
    /** The engine's own wording ("Up 3 days", "Exited (0) 2 hours ago"). */
    status: z.string().max(256),
    /** Published port mappings, as the engine prints them. */
    ports: z.string().max(512),
    createdAt: z.string().max(64),
    /**
     * Compose labels, when the container is compose-managed. `recreate` needs
     * the three of them: without a compose project there is no faithful way to
     * rebuild a container's run configuration.
     */
    composeProject: z.string().max(256).nullable(),
    composeService: z.string().max(256).nullable(),
    composeWorkingDir: z.string().max(1024).nullable()
});
export type DockerContainer = z.infer<typeof dockerContainerSchema>;

/** One image present on the host. */
export const dockerImageSchema = z.object({
    engine: containerEngineSchema,
    id: z.string().min(1).max(128),
    /** `repository:tag`, or `<none>:<none>` for a dangling layer. */
    reference: z.string().max(512),
    /** Human size as the engine prints it ("128MB"). */
    size: z.string().max(64),
    createdAt: z.string().max(64),
    /** Untagged leftover: the prime candidate for a cleanup. */
    dangling: z.boolean()
});
export type DockerImage = z.infer<typeof dockerImageSchema>;

export const dockerVolumeSchema = z.object({
    engine: containerEngineSchema,
    name: z.string().min(1).max(256),
    driver: z.string().max(64),
    mountpoint: z.string().max(1024)
});
export type DockerVolume = z.infer<typeof dockerVolumeSchema>;

export const dockerNetworkSchema = z.object({
    engine: containerEngineSchema,
    id: z.string().min(1).max(128),
    name: z.string().min(1).max(256),
    driver: z.string().max(64),
    scope: z.string().max(64)
});
export type DockerNetwork = z.infer<typeof dockerNetworkSchema>;

/**
 * What one engine answered. `reachable` false means its binary is there but the
 * daemon refused (socket permissions, daemon down): the UI must say that rather
 * than "no containers", which is what the user would otherwise read.
 */
export const dockerEngineStatusSchema = z.object({
    engine: containerEngineSchema,
    reachable: z.boolean(),
    /** Engine version when reachable, else why it is not. */
    version: z.string().max(128).nullable(),
    error: z.string().max(255).nullable()
});
export type DockerEngineStatus = z.infer<typeof dockerEngineStatusSchema>;

/**
 * A device's whole container inventory. Empty `engines` means neither binary is
 * installed — the honest "this host does not do containers".
 */
export const dockerInventorySchema = z.object({
    engines: z.array(dockerEngineStatusSchema),
    containers: z.array(dockerContainerSchema),
    images: z.array(dockerImageSchema),
    volumes: z.array(dockerVolumeSchema),
    networks: z.array(dockerNetworkSchema)
});
export type DockerInventory = z.infer<typeof dockerInventorySchema>;

/** Live resource use of one running container, from `docker stats --no-stream`. */
export const dockerStatSchema = z.object({
    engine: containerEngineSchema,
    id: z.string().min(1).max(128),
    /** Percent of a host CPU; `null` when the engine printed something unparseable. */
    cpuPercent: z.number().nullable(),
    memUsedBytes: z.number().int().nonnegative().nullable(),
    memLimitBytes: z.number().int().nonnegative().nullable(),
    memPercent: z.number().nullable(),
    netRxBytes: z.number().int().nonnegative().nullable(),
    netTxBytes: z.number().int().nonnegative().nullable(),
    blockReadBytes: z.number().int().nonnegative().nullable(),
    blockWriteBytes: z.number().int().nonnegative().nullable(),
    pids: z.number().int().nonnegative().nullable()
});
export type DockerStat = z.infer<typeof dockerStatSchema>;

/**
 * What may be asked of an engine. A closed list, mirrored by a `match` in the
 * agent: no argument but the target's identifier ever reaches a command line,
 * and there is no shell. Anything beyond this list is the remote terminal's job,
 * which is a separate permission.
 */
export const dockerActionSchema = z.enum([
    // Cycle de vie d'un conteneur.
    'start',
    'stop',
    'restart',
    'pause',
    'unpause',
    'kill',
    // Suppressions, chacune sur sa cible.
    'removeContainer',
    'removeImage',
    'removeVolume',
    'removeNetwork',
    // Nettoyages, sans cible.
    'pruneContainers',
    'pruneImages',
    'pruneVolumes',
    'pruneNetworks',
    'pruneBuildCache',
    // Mise à jour d'un service.
    'pull',
    'recreate',
    // Déploiement d'un service compose (`projet/service`) : son image, puis sa
    // recréation seule. Refusable par la machine (`allow_docker_deploy`).
    'composeDeploy'
]);
export type DockerAction = z.infer<typeof dockerActionSchema>;

/**
 * Actions that stream their output and can run for minutes. The server holds a
 * per-device lock on these, and the UI follows them live; the others answer in
 * one frame.
 */
export const DOCKER_LONG_ACTIONS = [
    'pull',
    'recreate',
    'composeDeploy',
    'pruneContainers',
    'pruneImages',
    'pruneVolumes',
    'pruneNetworks',
    'pruneBuildCache'
] as const satisfies readonly DockerAction[];

/** Actions that need no target: they act on the whole engine. */
export const DOCKER_UNTARGETED_ACTIONS = [
    'pruneContainers',
    'pruneImages',
    'pruneVolumes',
    'pruneNetworks',
    'pruneBuildCache'
] as const satisfies readonly DockerAction[];

export function isLongDockerAction(action: DockerAction): boolean {
    return (DOCKER_LONG_ACTIONS as readonly DockerAction[]).includes(action);
}

export function isUntargetedDockerAction(action: DockerAction): boolean {
    return (DOCKER_UNTARGETED_ACTIONS as readonly DockerAction[]).includes(action);
}
