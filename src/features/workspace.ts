import { z } from 'zod';
import { workspaceSchema } from '../domain/workspace';

export const workspaceAdd = {
    command: 'workspace.add' as const,
    input: z.object({ name: z.string().min(1).max(120) }),
    output: z.object({ workspace: workspaceSchema })
};

export const workspaceDelete = {
    command: 'workspace.delete' as const,
    input: z.object({ workspaceId: z.number().int().positive() }),
    output: z.object({ workspaceId: z.number().int().positive() })
};

export const workspaceSetFavoriteFeature = {
    command: 'workspace.setFavoriteFeature' as const,
    input: z.object({
        workspaceId: z.number().int().nonnegative(),
        featureId: z.string().min(1)
    }),
    output: z.object({
        workspaceId: z.number().int().nonnegative(),
        featureId: z.string().min(1)
    })
};

export const workspaceCommands = [
    workspaceAdd,
    workspaceDelete,
    workspaceSetFavoriteFeature
] as const;
