import { z } from 'zod';

/** How long a trusted browser stays trusted without a login, in days. */
export const TRUSTED_BROWSER_DAYS = 90;

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

/** The checks a login meets on a browser the account does not know. */
export const loginChecksStatusSchema = z.object({
    email: z.object({
        /** This server sends mail (`SMTP_HOST`): without it, the check does not exist. */
        available: z.boolean(),
        enabled: z.boolean(),
        /** The account's address, masked. */
        to: z.string()
    }),
    browsers: z.array(trustedBrowserSchema)
});

export type LoginChecksStatus = z.infer<typeof loginChecksStatusSchema>;
