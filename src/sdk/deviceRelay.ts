import { createServer, type AddressInfo, type Server } from 'node:net';
import type { Duplex } from 'node:stream';
import { AGENT_TUNNEL_PROBE } from '../protocol/agent';
import type { DeviceRelayOption } from './deviceRelayOption';
import {
    FeatureError,
    type AgentsFacade,
    type FeatureServiceDeps,
    type SdkAccessDenial,
    type SdkDevice,
    type SdkFeatureContext
} from './server';

/**
 * Reaching a service through the agent of a device (`agents.openTcp`): a
 * database on the machine's loopback, a Dokploy that only listens on the LAN.
 * The server-side outbound guard does not apply, the device's agent bounds
 * what it reaches (its loopback, plus the operator's `tunnel_targets`).
 *
 * A module stores the chosen device AND the member who chose it: the right to
 * open the device's network is re-checked on that member at every use, so a
 * saved choice is never a permission for good.
 *
 * Every message takes `what`, the thing being reached as a noun phrase with a
 * demonstrative (`'cette base'`, `'cette instance Dokploy'`).
 */

/** The Devices permission that opens a machine's network to another feature. */
export const DEVICE_NETWORK_RIGHT = 'network';

/** Why a member may no longer open a device's network, as a clause after "(...)". */
export const DEVICE_ACCESS_DENIALS: Record<SdkAccessDenial, string> = {
    not_member: 'il n’est plus membre de cet espace',
    suspended: 'son compte est suspendu',
    level: 'son rôle ne le permet plus',
    not_granted: 'la permission lui a été retirée',
    hidden: 'cet appareil lui est fermé',
    read_only: 'cet appareil est en lecture seule pour lui',
    no_device: 'l’appareil n’est plus dans cet espace'
};

/**
 * A connection opened by a device's agent to a host on ITS side. Rights,
 * presence and agent version are checked before one is handed out.
 */
export type DeviceRelay = (target: { host: string; port: number }) => Promise<Duplex>;

/** A local listener standing for the remote host, and how to close it. */
export interface LocalTunnel {
    /** Always the loopback: what a driver or an HTTP client connects to. */
    host: string;
    port: number;
    close: () => Promise<void>;
}

/** The device saved on an item, with the member who chose it. */
export interface SavedDeviceChoice {
    deviceId?: string | null;
    authorUserId?: number | null;
}

/** The chosen device, if the caller may open its network; a `validation` error when none is chosen. */
export async function authorizeRelayDevice(
    ctx: SdkFeatureContext<unknown>,
    deviceId: string | null,
    what: string
): Promise<SdkDevice> {
    if (!deviceId) {
        throw new FeatureError('validation', `Choisissez l’appareil par lequel joindre ${what}.`);
    }
    return ctx.deveye.devices.authorize(deviceId, { extras: [DEVICE_NETWORK_RIGHT] });
}

/**
 * The workspace's devices, each with what keeps the caller from choosing it
 * (right, agent version, machine policy). A device one cannot choose stays
 * listed: that is how one learns why.
 */
export async function relayDeviceOptions(
    ctx: SdkFeatureContext<unknown>,
    what: string
): Promise<DeviceRelayOption[]> {
    const devices = await ctx.deveye.devices.list();
    return Promise.all(
        devices.map(async (device): Promise<DeviceRelayOption> => {
            const allowed = await ctx.deveye.devices
                .authorize(device.id, { extras: [DEVICE_NETWORK_RIGHT] })
                .then(
                    () => true,
                    () => false
                );
            const agent = device.report?.agent;
            const blocked = !allowed
                ? 'Vous n’avez pas le droit « Accès au réseau de l’appareil » sur cet appareil.'
                : !agent?.probes.includes(AGENT_TUNNEL_PROBE)
                  ? `Son agent est à mettre à jour pour joindre ${what}.`
                  : !agent.policy.tunnel
                    ? 'La machine refuse les tunnels : allow_tunnel = false dans la configuration de son agent.'
                    : null;
            return { id: device.id, name: device.name, online: device.online, blocked };
        })
    );
}

/** A device's relay, after what is better said before trying: offline, agent too old. */
export function relayOf(
    agents: AgentsFacade,
    device: SdkDevice,
    online: boolean,
    what: string
): DeviceRelay {
    if (!online) throw new Error(`L’appareil « ${device.name} » est hors ligne.`);
    if (!device.report?.agent?.probes.includes(AGENT_TUNNEL_PROBE)) {
        throw new Error(`L’agent de « ${device.name} » est à mettre à jour pour joindre ${what}.`);
    }
    return (target) => agents.openTcp(device.id, target);
}

/**
 * The relay of a saved choice, for work without a session (a background job):
 * valid as long as the member who chose the device still holds the right to
 * open its network. Throws a readable message otherwise.
 */
export async function relayForAuthor(
    deps: Pick<FeatureServiceDeps<unknown>, 'access' | 'agents' | 'devices'>,
    workspaceId: number,
    saved: SavedDeviceChoice,
    what: string
): Promise<DeviceRelay> {
    if (!saved.deviceId || !saved.authorUserId) {
        throw new Error(`Aucun appareil n’est choisi pour joindre ${what}.`);
    }
    const may = await deps.access.device(workspaceId, saved.authorUserId, saved.deviceId, [
        DEVICE_NETWORK_RIGHT
    ]);
    if (!may.ok) {
        throw new Error(
            `Le membre qui a choisi l’appareil de ${what} ne peut plus en ouvrir le réseau (${DEVICE_ACCESS_DENIALS[may.reason]}) : ` +
                'un membre qui en a le droit doit enregistrer l’accès de nouveau.'
        );
    }
    const device = await deps.devices.find(saved.deviceId);
    if (!device) throw new Error(`L’appareil de ${what} a été supprimé.`);
    return relayOf(deps.agents, device, deps.devices.isOnline(device.id), what);
}

/**
 * A local listener that hands every incoming connection to `connect`. For a
 * client that only connects to a host (`pg`, `pg_dump`, an HTTP agent). An
 * error on an established connection only drops that one, never the process.
 * Always close it in a `finally`: forgotten, it leaves a listener behind.
 */
export async function localForwarder(
    connect: () => Promise<Duplex>,
    onClose: () => Promise<void> = async () => {}
): Promise<LocalTunnel> {
    const server: Server = createServer((client) => {
        void (async () => {
            try {
                const remote = await connect();
                client.pipe(remote);
                remote.pipe(client);
                const drop = () => {
                    client.destroy();
                    remote.destroy();
                };
                client.on('error', drop);
                remote.on('error', drop);
                remote.on('close', () => client.destroy());
            } catch {
                client.destroy();
            }
        })();
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        // `127.0.0.1`, never `0.0.0.0`: exposed, this listener would open the
        // remote service to anyone, unauthenticated.
        server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address() as AddressInfo;
    return {
        host: '127.0.0.1',
        port: address.port,
        close: async () => {
            await new Promise<void>((resolve) => server.close(() => resolve()));
            await onClose();
        }
    };
}

/**
 * A local listener that reaches `target` through the device. One connection is
 * opened right away: a refused or unreachable target is said here, in the
 * agent's words, where a client behind the forwarder would only see a dropped
 * connection.
 */
export async function openDeviceTunnel(
    relay: DeviceRelay | null,
    target: { host: string; port: number },
    what: string
): Promise<LocalTunnel> {
    if (!relay) throw new Error(`Aucun appareil n’est choisi pour joindre ${what}.`);
    const connect = () => relay(target);
    const probe = await connect();
    probe.destroy();
    return localForwarder(connect);
}
