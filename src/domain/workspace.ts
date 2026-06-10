import { z } from 'zod';
import { minimalUserSchema } from './user';

export const workspaceSchema = z.object({
    id: z.number().int().nonnegative(),
    name: z.string().min(1),
    logo: z.string(),
    users: z.array(minimalUserSchema),
    features: z.array(z.string().min(1)),
    reAuthInterval: z.number().int().nullable(),
    created: z.number().int().nonnegative()
});

export type Workspace = z.infer<typeof workspaceSchema>;

export interface WorkspaceRow {
    id: number;
    name: string;
    logo: string;
    features: string;
    password_hash: string;
    re_auth_interval: number | null;
    created: number;
}

export interface WorkspaceMemberRow {
    id: number;
    user_id: number;
    workspace_id: number;
    roles: string;
    date: number;
}
