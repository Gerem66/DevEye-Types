import { z } from 'zod';

/**
 * Driving a machine (its terminal, its files, its containers, its power, its
 * network, a new one paired) needs a code from the account's authenticator app,
 * typed in the same session less than `minutes` ago. Seeing a machine needs
 * nothing: a stolen password or cookie watches, it does not drive.
 */
export const STEP_UP_MINUTES_MIN = 1;
export const STEP_UP_MINUTES_MAX = 480;
export const STEP_UP_MINUTES_DEFAULT = 15;
/** Asked again after this many minutes or less: short enough to count as a protection. */
export const STEP_UP_STRICT_MINUTES = 30;

export const stepUpStatusSchema = z.object({
    /** The account has an authenticator app: without one, no machine can be driven. */
    twoFactor: z.boolean(),
    /** Minutes without driving after which the code is asked again. */
    minutes: z.number().int().min(STEP_UP_MINUTES_MIN).max(STEP_UP_MINUTES_MAX),
    /** When this session's confirmation lapses (epoch ms), `null` without one. */
    confirmedUntil: z.number().int().nullable()
});

export type StepUpStatus = z.infer<typeof stepUpStatusSchema>;

/** `details` of a `stepup_required` refusal. */
export const stepUpRequiredDetailsSchema = z.object({ twoFactor: z.boolean() });

export type StepUpRequiredDetails = z.infer<typeof stepUpRequiredDetailsSchema>;
