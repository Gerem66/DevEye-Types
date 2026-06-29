import { z } from 'zod';

const deviceId = z.uuid();
const sessionId = z.string().min(1).max(64);
const cols = z.number().int().min(1).max(2000);
const rows = z.number().int().min(1).max(2000);
/** Base64-encoded terminal bytes, capped per frame (~1.5 MB). */
const data = z.string().max(2_000_000);
/**
 * Optional OS account to open the session under. Restricted to safe username
 * characters (no shell metacharacters), since it reaches a `su` on the device.
 */
export const terminalUser = z
    .string()
    .regex(/^[A-Za-z0-9._-]+$/, 'Nom d’utilisateur invalide')
    .max(32);

/**
 * Open an interactive terminal (PTY) on the device. Owner-or-admin + agent online.
 * `sessionId` is client-generated and ties every later input/resize/close and the
 * streamed `device.termOutput` / `device.termExit` push events together (the caller
 * must be subscribed). `user` runs the shell under that account (`su -l`); omitted
 * → the account the agent itself runs as.
 */
export const deviceTermOpen = {
    command: 'device.termOpen' as const,
    input: z.object({ deviceId, sessionId, cols, rows, user: terminalUser.optional() }),
    output: z.object({ ok: z.boolean() })
};

/** Send input (keystrokes / paste) to a terminal session. `data` is base64 bytes. */
export const deviceTermInput = {
    command: 'device.termInput' as const,
    input: z.object({ deviceId, sessionId, data }),
    output: z.object({ ok: z.boolean() })
};

/** Resize a terminal session's PTY to match the client viewport. */
export const deviceTermResize = {
    command: 'device.termResize' as const,
    input: z.object({ deviceId, sessionId, cols, rows }),
    output: z.object({ ok: z.boolean() })
};

/** Close a terminal session (kills the shell and frees the PTY). */
export const deviceTermClose = {
    command: 'device.termClose' as const,
    input: z.object({ deviceId, sessionId }),
    output: z.object({ ok: z.boolean() })
};

export const deviceTerminalCommands = [
    deviceTermOpen,
    deviceTermInput,
    deviceTermResize,
    deviceTermClose
] as const;
