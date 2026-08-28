import { z } from 'zod';
import { deviceCommands } from './device';
import { deviceFilesCommands } from './deviceFiles';
import { deviceLogCommands } from './deviceLogs';
import { deviceTerminalCommands } from './deviceTerminal';
import { homeCommands } from './home';
import { liveCommands } from './live';
import { logsCommands } from './logs';
import { metricsCommands } from './metrics';
import { notifyCommands } from './notify';
import { sharingCommands } from './sharing';
import { secrecyCommands } from './secrecy';
import { twoFactorCommands } from './twoFactor';
import { userCommands } from './user';
import { adminCommands } from './admin';
import { workspaceCommands } from './workspace';

export interface FeatureCommandDescriptor<C extends string = string> {
    command: C;
    input: z.ZodTypeAny;
    output: z.ZodTypeAny;
}

export const featureCommands = [
    ...workspaceCommands,
    ...adminCommands,
    ...userCommands,
    ...deviceCommands,
    ...deviceLogCommands,
    ...deviceTerminalCommands,
    ...deviceFilesCommands,
    ...metricsCommands,
    ...twoFactorCommands,
    ...secrecyCommands,
    ...logsCommands,
    ...homeCommands,
    ...notifyCommands,
    ...sharingCommands,
    ...liveCommands
] as const;

export const featureCommandRegistry: Record<string, FeatureCommandDescriptor> = Object.fromEntries(
    featureCommands.map((c) => [c.command, c])
);

/**
 * Verse les contrats d'un module installé dans le registre des commandes,
 * celui que le `ws.send` du client consulte avant tout envoi. Sans cet
 * enregistrement, chaque commande d'un module serait refusée côté client
 * (« Unknown command ») avant même d'atteindre la socket, et son interface
 * resterait en chargement pour toujours.
 *
 * Une native rapatriée déclare les MÊMES objets que le registre publié : la
 * réinscription à l'identique est un no-op. Deux contrats différents sous le
 * même nom, en revanche, sont une collision de config, et le chargement doit
 * le dire plutôt que d'en servir un des deux au hasard.
 */
export function registerFeatureCommands(commands: readonly FeatureCommandDescriptor[]): void {
    for (const c of commands) {
        const existing = featureCommandRegistry[c.command];
        if (existing === c) continue;
        if (existing) {
            throw new Error(
                `registerFeatureCommands: « ${c.command} » est déjà enregistrée par un autre module`
            );
        }
        featureCommandRegistry[c.command] = c;
    }
}

export type FeatureCommandName = (typeof featureCommands)[number]['command'];

export type CommandInput<N extends FeatureCommandName> = z.infer<
    Extract<(typeof featureCommands)[number], { command: N }>['input']
>;

export type CommandOutput<N extends FeatureCommandName> = z.infer<
    Extract<(typeof featureCommands)[number], { command: N }>['output']
>;
