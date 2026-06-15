import { z } from 'zod';
import { deviceCommands } from './device';
import { metricsCommands } from './metrics';
import { passwordCommands } from './password';
import { twoFactorCommands } from './twoFactor';
import { weatherCommands } from './weather';
import { workspaceCommands } from './workspace';

export interface FeatureCommandDescriptor<C extends string = string> {
    command: C;
    input: z.ZodTypeAny;
    output: z.ZodTypeAny;
}

export const featureCommands = [
    ...workspaceCommands,
    ...passwordCommands,
    ...deviceCommands,
    ...metricsCommands,
    ...weatherCommands,
    ...twoFactorCommands
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
