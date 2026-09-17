import { z } from 'zod';
import { agentCommands } from './agent';
import { domainCommands } from './domain';
import { feedbackCommands } from './feedback';
import { homeCommands } from './home';
import { liveCommands } from './live';
import { logsCommands } from './logs';
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
    ...agentCommands,
    ...twoFactorCommands,
    ...secrecyCommands,
    ...logsCommands,
    ...feedbackCommands,
    ...homeCommands,
    ...notifyCommands,
    ...sharingCommands,
    ...domainCommands,
    ...liveCommands
] as const;

export const featureCommandRegistry: Record<string, FeatureCommandDescriptor> = Object.fromEntries(
    featureCommands.map((c) => [c.command, c])
);

/**
 * Verse les contrats d'un module installé dans le registre des commandes, que
 * le `ws.send` du client consulte avant tout envoi ; sans cela, chaque commande
 * du module serait refusée côté client (« Unknown command »). Réinscrire les
 * mêmes objets est un no-op ; deux contrats différents sous le même nom sont
 * une collision de config, et le chargement doit le dire.
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
