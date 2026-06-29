import { z } from 'zod';
import { deviceCommands } from './device';
import { deviceLogCommands } from './deviceLogs';
import { deviceTerminalCommands } from './deviceTerminal';
import { homeCommands } from './home';
import { logsCommands } from './logs';
import { metricsCommands } from './metrics';
import { noteCommands } from './note';
import { passwordCommands } from './password';
import { secrecyCommands } from './secrecy';
import { twoFactorCommands } from './twoFactor';
import { userCommands } from './user';
import { weatherCommands } from './weather';
import { workspaceCommands } from './workspace';

export interface FeatureCommandDescriptor<C extends string = string> {
    command: C;
    input: z.ZodTypeAny;
    output: z.ZodTypeAny;
}

export const featureCommands = [
    ...workspaceCommands,
    ...userCommands,
    ...passwordCommands,
    ...noteCommands,
    ...deviceCommands,
    ...deviceLogCommands,
    ...deviceTerminalCommands,
    ...metricsCommands,
    ...weatherCommands,
    ...twoFactorCommands,
    ...secrecyCommands,
    ...logsCommands,
    ...homeCommands
] as const;

export const featureCommandRegistry: Record<string, FeatureCommandDescriptor> = Object.fromEntries(
    featureCommands.map((c) => [c.command, c])
);

export type FeatureCommandName = (typeof featureCommands)[number]['command'];

export type CommandInput<N extends FeatureCommandName> = z.infer<
    Extract<(typeof featureCommands)[number], { command: N }>['input']
>;

export type CommandOutput<N extends FeatureCommandName> = z.infer<
    Extract<(typeof featureCommands)[number], { command: N }>['output']
>;
