import assert from 'node:assert/strict';
import { connect, createServer, type AddressInfo, type Server } from 'node:net';
import { after, before, describe, it } from 'node:test';

import {
    localForwarder,
    openDeviceTunnel,
    relayForAuthor,
    relayOf,
    type DeviceRelay
} from './deviceRelay';
import { AGENT_TUNNEL_PROBE } from '../protocol/agent';
import type { AgentsFacade, FeatureServiceDeps, SdkDevice } from './server';

/** An echo service standing for what only the device can reach. */
let echo: Server;
let echoPort = 0;

before(async () => {
    echo = createServer((socket) => socket.pipe(socket));
    await new Promise<void>((resolve) => echo.listen(0, '127.0.0.1', resolve));
    echoPort = (echo.address() as AddressInfo).port;
});

after(async () => {
    await new Promise<void>((resolve) => echo.close(() => resolve()));
});

/** Sends `text` to `host:port` and returns what comes back. */
function roundTrip(host: string, port: number, text: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const socket = connect({ host, port }, () => socket.write(text));
        socket.once('data', (chunk) => {
            resolve(chunk.toString());
            socket.destroy();
        });
        socket.once('error', reject);
    });
}

describe('localForwarder', () => {
    it('listens on the loopback only and relays each connection to what connect() opens', async () => {
        let opened = 0;
        const tunnel = await localForwarder(async () => {
            opened++;
            return connect({ host: '127.0.0.1', port: echoPort });
        });
        try {
            assert.equal(tunnel.host, '127.0.0.1');
            assert.equal(await roundTrip(tunnel.host, tunnel.port, 'ping'), 'ping');
            assert.equal(await roundTrip(tunnel.host, tunnel.port, 'pong'), 'pong');
            assert.equal(opened, 2);
        } finally {
            await tunnel.close();
        }
        await assert.rejects(
            roundTrip(tunnel.host, tunnel.port, 'late'),
            'closed: nothing listens any more'
        );
    });

    it('drops a client whose connection could not be opened, and runs onClose once closed', async () => {
        let closed = false;
        const tunnel = await localForwarder(
            async () => {
                throw new Error('refused by the agent');
            },
            async () => {
                closed = true;
            }
        );
        try {
            await assert.rejects(
                new Promise((resolve, reject) => {
                    const socket = connect({ host: tunnel.host, port: tunnel.port });
                    socket.once('close', () => reject(new Error('dropped')));
                    socket.once('data', resolve);
                })
            );
        } finally {
            await tunnel.close();
        }
        assert.equal(closed, true);
    });
});

describe('openDeviceTunnel', () => {
    it('probes the target through the relay first, so a refusal is said in the relay’s words', async () => {
        const relay: DeviceRelay = async () => {
            throw new Error('L’appareil « Serveur » est hors ligne.');
        };
        await assert.rejects(
            openDeviceTunnel(relay, { host: '127.0.0.1', port: 1 }, 'cette base'),
            {
                message: 'L’appareil « Serveur » est hors ligne.'
            }
        );
        await assert.rejects(openDeviceTunnel(null, { host: '127.0.0.1', port: 1 }, 'cette base'), {
            message: 'Aucun appareil n’est choisi pour joindre cette base.'
        });
    });

    it('then relays every connection to the target the relay opens', async () => {
        const targets: { host: string; port: number }[] = [];
        const relay: DeviceRelay = async (target) => {
            targets.push(target);
            return connect(target);
        };
        const tunnel = await openDeviceTunnel(
            relay,
            { host: '127.0.0.1', port: echoPort },
            'cette base'
        );
        try {
            assert.equal(await roundTrip(tunnel.host, tunnel.port, 'hello'), 'hello');
        } finally {
            await tunnel.close();
        }
        // The probe, then the connection.
        assert.equal(targets.length, 2);
        assert.deepEqual(targets[1], { host: '127.0.0.1', port: echoPort });
    });
});

function device(over: Partial<SdkDevice> = {}): SdkDevice {
    return {
        id: 'd1',
        name: 'Serveur',
        online: true,
        report: { agent: { probes: [AGENT_TUNNEL_PROBE], policy: { tunnel: true } } },
        ...over
    } as unknown as SdkDevice;
}

const agents = {
    openTcp: async () => connect({ host: '127.0.0.1', port: echoPort })
} as unknown as AgentsFacade;

describe('relayOf', () => {
    it('refuses an offline device and an agent that predates tunnels, before any connection', () => {
        assert.throws(() => relayOf(agents, device(), false, 'cette base'), {
            message: 'L’appareil « Serveur » est hors ligne.'
        });
        assert.throws(
            () =>
                relayOf(
                    agents,
                    device({ report: { agent: { probes: [], policy: {} } } } as never),
                    true,
                    'cette base'
                ),
            { message: 'L’agent de « Serveur » est à mettre à jour pour joindre cette base.' }
        );
        assert.equal(typeof relayOf(agents, device(), true, 'cette base'), 'function');
    });
});

describe('relayForAuthor', () => {
    type Deps = Pick<FeatureServiceDeps<unknown>, 'access' | 'agents' | 'devices'>;
    const deps = (
        verdict: { ok: true } | { ok: false; reason: 'not_granted' },
        found: SdkDevice | null
    ): Deps =>
        ({
            access: { device: async () => verdict },
            agents,
            devices: { find: async () => found, isOnline: () => true }
        }) as unknown as Deps;

    it('needs both the device and the member who chose it', async () => {
        await assert.rejects(
            relayForAuthor(deps({ ok: true }, device()), 1, { deviceId: 'd1' }, 'cette base'),
            {
                message: 'Aucun appareil n’est choisi pour joindre cette base.'
            }
        );
    });

    it('re-checks the author’s right on the device, and says what was lost', async () => {
        await assert.rejects(
            relayForAuthor(
                deps({ ok: false, reason: 'not_granted' }, device()),
                1,
                { deviceId: 'd1', authorUserId: 7 },
                'cette base'
            ),
            /la permission lui a été retirée/
        );
        await assert.rejects(
            relayForAuthor(
                deps({ ok: true }, null),
                1,
                { deviceId: 'd1', authorUserId: 7 },
                'cette base'
            ),
            { message: 'L’appareil de cette base a été supprimé.' }
        );
        const relay = await relayForAuthor(
            deps({ ok: true }, device()),
            1,
            { deviceId: 'd1', authorUserId: 7 },
            'cette base'
        );
        assert.equal(typeof relay, 'function');
    });
});
