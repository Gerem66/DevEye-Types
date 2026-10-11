import { z } from 'zod';
import { STEP_UP_MINUTES_MAX, STEP_UP_MINUTES_MIN, stepUpStatusSchema } from '../domain/stepUp';

export const stepUpStatus = {
    command: 'stepup.status' as const,
    input: z.object({}),
    output: z.object({ status: stepUpStatusSchema })
};

/** Confirm with a current authenticator code, or a recovery code (spent). */
export const stepUpConfirm = {
    command: 'stepup.confirm' as const,
    input: z.object({ code: z.string().min(6).max(24) }),
    output: z.object({ status: stepUpStatusSchema })
};

/** How long a confirmation lasts without driving a machine. */
export const stepUpSetInterval = {
    command: 'stepup.setInterval' as const,
    input: z.object({
        minutes: z.number().int().min(STEP_UP_MINUTES_MIN).max(STEP_UP_MINUTES_MAX)
    }),
    output: z.object({ status: stepUpStatusSchema })
};

export const stepUpCommands = [stepUpStatus, stepUpConfirm, stepUpSetInterval] as const;
