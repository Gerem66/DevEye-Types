import { z } from 'zod';

import {
    TASK_TEXT_MAX,
    TASK_TITLE_MAX,
    requestProgressSchema,
    taskIdSchema
} from '../protocol/envelope';
import { ErrorCodeSchema } from '../protocol/error';

/**
 * A long operation, as the server follows it and as the operations area of the
 * top bar shows it: a command a client tagged, or the work a service runs for
 * an account. It belongs to the account that started it and is never shown to
 * the other members of the workspace.
 *
 * The server keeps it in memory only: a restart forgets every operation, and
 * the `epoch` of the roster tells a client that it happened.
 */
export const taskStateSchema = z.enum(['running', 'done', 'failed']);
export type TaskState = z.infer<typeof taskStateSchema>;

export const taskSchema = z.object({
    id: taskIdSchema,
    state: taskStateSchema,
    title: z.string().max(TASK_TITLE_MAX),
    subject: z.string().max(TASK_TEXT_MAX).nullable(),
    feature: z.string().max(64).nullable(),
    itemId: z.string().max(64).nullable(),
    key: z.string().max(64).nullable(),
    /** The workspace the command ran in. */
    workspaceId: z.number().int().positive(),
    /** Milliseconds since the epoch. */
    startedAt: z.number().int(),
    endedAt: z.number().int().nullable(),
    progress: requestProgressSchema.omit({ requestId: true }).nullable(),
    /** The account may ask it to stop (`task.cancel`): an operation a service runs and knows how to stop. */
    cancellable: z.boolean(),
    /** The caller's sentences, for a tab that did not start the operation. */
    done: z.string().max(TASK_TEXT_MAX).nullable(),
    failed: z.string().max(TASK_TEXT_MAX).nullable(),
    /** Why it failed. Never the `details` of the refusal: they may quote the input. */
    error: z.object({ code: ErrorCodeSchema, message: z.string().max(500) }).nullable()
});
export type TaskSnapshot = z.infer<typeof taskSchema>;

/** An operation appeared, moved on or ended. Payload: {@link taskSchema}. */
export const TASK_UPDATE_EVENT = 'task.update' as const;

/** Operations were dismissed, here or in another tab. */
export const TASK_REMOVED_EVENT = 'task.removed' as const;
export const taskRemovedSchema = z.object({ ids: z.array(taskIdSchema).max(200) });
export type TaskRemoved = z.infer<typeof taskRemovedSchema>;

/**
 * The operations of the account when a socket opens, carried by the `session`
 * frame. `epoch` changes with every start of the server: an operation a client
 * still shows as running and that a new epoch does not list was interrupted.
 */
export const taskRosterSchema = z.object({
    epoch: z.string().min(1).max(64),
    list: z.array(taskSchema).max(200)
});
export type TaskRoster = z.infer<typeof taskRosterSchema>;
