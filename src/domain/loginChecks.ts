import { z } from 'zod';
import { loginStepSchema } from '../http/auth';

/** How long a trusted browser stays trusted without a login, in days. */
export const TRUSTED_BROWSER_DAYS = 90;

/** How long a successful login stays in the account's history, in days. */
export const LOGIN_HISTORY_DAYS = 90;

/** The part of that history the account is shown by default, in days. */
export const LOGIN_HISTORY_WINDOW_DAYS = 30;

/** More trusted browsers than this no longer counts as a protection of the account. */
export const TRUSTED_BROWSERS_MAX = 3;

/** A browser whose logins skip the mailed and texted codes. */
export const trustedBrowserSchema = z.object({
    id: z.number().int().positive(),
    /** Browser and system, from the user agent (`Firefox sur Linux`). */
    label: z.string(),
    /** Epoch seconds. */
    createdAt: z.number().int(),
    /** Epoch seconds: its last login. */
    lastUsedAt: z.number().int()
});

export type TrustedBrowser = z.infer<typeof trustedBrowserSchema>;

/**
 * One successful login of the account, kept so a login from a device that is
 * not the account's can be spotted. Never removed by the account: an intruder
 * must not be able to erase their trace.
 */
export const loginEntrySchema = z.object({
    id: z.number().int().positive(),
    /** Epoch seconds. */
    at: z.number().int(),
    /** Browser and system, from the user agent (`Firefox sur Linux`). */
    label: z.string(),
    ip: z.string(),
    /** The codes the login went through after the password; none for a trusted browser. */
    steps: z.array(loginStepSchema),
    /** The browser was trusted at the time. */
    trusted: z.boolean(),
    /** The login that opened the session asking. */
    current: z.boolean()
});

export type LoginEntry = z.infer<typeof loginEntrySchema>;

/** The checks a login meets on a browser the account does not know. */
export const loginChecksStatusSchema = z.object({
    email: z.object({
        /** This server sends mail (`SMTP_HOST`): without it, the check does not exist. */
        available: z.boolean(),
        enabled: z.boolean(),
        /** The account's address, masked. */
        to: z.string()
    }),
    sms: z.object({
        /** This server sends texts (`SMS_OVH_*`): without it, the check does not exist. */
        available: z.boolean(),
        enabled: z.boolean(),
        /** The verified number, masked; `null` without one. */
        phone: z.string().nullable()
    }),
    browsers: z.array(trustedBrowserSchema),
    /** Successful logins over the last `LOGIN_HISTORY_WINDOW_DAYS` days. */
    recentLogins: z.number().int().nonnegative()
});

export type LoginChecksStatus = z.infer<typeof loginChecksStatusSchema>;
