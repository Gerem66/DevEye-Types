import { z } from 'zod';
import {
    REMOTE_LABEL_MAX,
    remoteInstanceSchema,
    remoteOriginSchema
} from '../domain/remoteInstance';

/**
 * Les instances distantes du compte. Commandes de compte : elles visent la
 * ligne de l'appelant quel que soit l'espace porté par l'enveloppe.
 */

const labelSchema = z.string().trim().min(1).max(REMOTE_LABEL_MAX);

export const remoteList = {
    command: 'remote.list' as const,
    input: z.object({}),
    output: z.object({ instances: z.array(remoteInstanceSchema) })
};

export const remoteAdd = {
    command: 'remote.add' as const,
    input: z.object({ label: labelSchema, origin: remoteOriginSchema }),
    output: z.object({ instance: remoteInstanceSchema })
};

export const remoteRename = {
    command: 'remote.rename' as const,
    input: z.object({ id: z.number().int().positive(), label: labelSchema }),
    output: z.object({ instance: remoteInstanceSchema })
};

export const remoteRemove = {
    command: 'remote.remove' as const,
    input: z.object({ id: z.number().int().positive() }),
    output: z.object({ id: z.number().int().positive() })
};

/** L'ordre complet des instances, tel que le menu des espaces les range. */
export const remoteReorder = {
    command: 'remote.reorder' as const,
    input: z.object({ ids: z.array(z.number().int().positive()).max(32) }),
    output: z.object({ instances: z.array(remoteInstanceSchema) })
};

export const remoteCommands = [
    remoteList,
    remoteAdd,
    remoteRename,
    remoteRemove,
    remoteReorder
] as const;
