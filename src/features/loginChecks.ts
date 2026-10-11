import { z } from 'zod';
import { loginChecksStatusSchema } from '../domain/loginChecks';

const output = z.object({ status: loginChecksStatusSchema });

export const loginChecksStatus = {
    command: 'loginChecks.status' as const,
    input: z.object({}),
    output
};

/**
 * Turn the mailed code on or off. Turning it off asks for the account password:
 * a stolen session must not lower the guard of the next login.
 */
export const loginChecksSetEmail = {
    command: 'loginChecks.setEmail' as const,
    input: z.object({ enabled: z.boolean(), password: z.string().min(1).max(512).optional() }),
    output
};

/**
 * Turn the texted code on or off, for the verified number. Turning it off asks
 * for the account password, as for the mailed code.
 */
export const loginChecksSetSms = {
    command: 'loginChecks.setSms' as const,
    input: z.object({ enabled: z.boolean(), password: z.string().min(1).max(512).optional() }),
    output
};

/**
 * Send a code to a new number, to prove it is the account's. The account
 * password is asked: a stolen session must not move the texted code to its own
 * phone. Answers where the code went, masked.
 */
export const loginChecksPhoneStart = {
    command: 'loginChecks.phoneStart' as const,
    input: z.object({ phone: z.string().min(4).max(32), password: z.string().min(1).max(512) }),
    output: z.object({ to: z.string() })
};

/** The code received: the number becomes the account's, the texted code turned on. */
export const loginChecksPhoneConfirm = {
    command: 'loginChecks.phoneConfirm' as const,
    input: z.object({ code: z.string().length(6) }),
    output
};

/** Forget the account's number, and the texted code with it. */
export const loginChecksPhoneRemove = {
    command: 'loginChecks.phoneRemove' as const,
    input: z.object({ password: z.string().min(1).max(512) }),
    output
};

/** Stop trusting one browser: its next login asks for the codes again. */
export const loginChecksForgetBrowser = {
    command: 'loginChecks.forgetBrowser' as const,
    input: z.object({ id: z.number().int().positive() }),
    output
};

/** Stop trusting every browser of the account. */
export const loginChecksForgetBrowsers = {
    command: 'loginChecks.forgetBrowsers' as const,
    input: z.object({}),
    output
};

export const loginChecksCommands = [
    loginChecksStatus,
    loginChecksSetEmail,
    loginChecksSetSms,
    loginChecksPhoneStart,
    loginChecksPhoneConfirm,
    loginChecksPhoneRemove,
    loginChecksForgetBrowser,
    loginChecksForgetBrowsers
] as const;
