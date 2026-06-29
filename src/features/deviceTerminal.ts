import { z } from 'zod';

const deviceId = z.uuid();
const sessionId = z.string().min(1).max(64);
const cols = z.number().int().min(1).max(2000);
const rows = z.number().int().min(1).max(2000);
/** Base64-encoded terminal bytes, capped per frame (~1.5 MB). */
const data = z.string().max(2_000_000);

/**
 * Open an interactive terminal (PTY) on the device, running the agent user's
 * shell. Owner-or-admin + agent online. `sessionId` is client-generated and ties
 * every later input/resize/close and the streamed `device.termOutput` /
 * `device.termExit` push events together (the caller must be subscribed).
 */
export const deviceTermOpen = {
    command: 'device.termOpen' as const,
    input: z.object({ deviceId, sessionId, cols, rows }),
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
