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

/**
 * Asks a running operation to stop: one a service runs and declared it can
 * stop. `accepted` is false when it cannot (not cancellable, already ended,
 * the account lost the feature); the operation leaves the area when the
 * service has actually stopped.
 */
export const taskCancel = {
    command: 'task.cancel' as const,
    input: z.object({ id: taskIdSchema }),
    output: z.object({ accepted: z.boolean() })
};

export const taskCommands = [taskAttach, taskDismiss, taskCancel] as const;
