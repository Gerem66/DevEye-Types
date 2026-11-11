import { z } from 'zod';
import { taskIdSchema } from '../protocol/envelope';

/**
 * Claims the operations whose request this page still awaits, after its socket
 * came back: the server sends their answer to this socket when they end, or at
 * once when they already have. `lost`: the ones it no longer knows (it
 * restarted, the answer expired) or that this page did not start.
 */
export const taskAttach = {
    command: 'task.attach' as const,
    input: z.object({
        claims: z
            .array(z.object({ id: taskIdSchema, requestId: z.string().min(1).max(64) }))
            .min(1)
            .max(50)
    }),
    output: z.object({ lost: z.array(taskIdSchema) })
};

/**
 * Removes operations from the account's area, in every tab. On one that still
 * runs it only stops following it: the command goes on. Unknown ids are
 * ignored; the answer lists the ones removed.
 */
export const taskDismiss = {
    command: 'task.dismiss' as const,
    input: z.object({ ids: z.array(taskIdSchema).min(1).max(50) }),
    output: z.object({ ids: z.array(taskIdSchema) })
};

export const taskCommands = [taskAttach, taskDismiss] as const;
