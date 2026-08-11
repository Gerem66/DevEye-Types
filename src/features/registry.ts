import { z } from 'zod';
import { cloudSyncCommands } from './cloudSync';
import { deviceCommands } from './device';
import { deviceFilesCommands } from './deviceFiles';
import { deviceLogCommands } from './deviceLogs';
import { deviceTerminalCommands } from './deviceTerminal';
import { databaseCommands } from './database';
import { gitCommands } from './git';
import { homeCommands } from './home';
import { liveCommands } from './live';
import { logsCommands } from './logs';
import { mailCommands } from './mail';
import { metricsCommands } from './metrics';
import { noteCommands } from './note';
import { passwordCommands } from './password';
import { projectCommands } from './project';
import { secrecyCommands } from './secrecy';
import { sentinelCommands } from './sentinel';
import { twoFactorCommands } from './twoFactor';
import { uptimeCommands } from './uptime';
import { userCommands } from './user';
import { weatherCommands } from './weather';
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
    ...passwordCommands,
    ...noteCommands,
    ...projectCommands,
    ...gitCommands,
    ...databaseCommands,
    ...deviceCommands,
    ...deviceLogCommands,
    ...deviceTerminalCommands,
    ...deviceFilesCommands,
    ...cloudSyncCommands,
    ...metricsCommands,
    ...sentinelCommands,
    ...weatherCommands,
    ...uptimeCommands,
    ...twoFactorCommands,
    ...secrecyCommands,
    ...logsCommands,
    ...homeCommands,
    ...mailCommands,
    ...liveCommands
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
