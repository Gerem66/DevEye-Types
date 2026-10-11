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
    loginChecksForgetBrowser,
    loginChecksForgetBrowsers
] as const;
