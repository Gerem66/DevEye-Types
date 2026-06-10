import { z } from 'zod';
import { ProtocolErrorSchema, type ErrorCode, type ProtocolError } from './error';

export type Result<T, E = ProtocolError> = { ok: true; data: T } | { ok: false; error: E };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const err = (code: ErrorCode, message: string, details?: unknown): Result<never> => ({
    ok: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) }
});

export const resultSchema = <T extends z.ZodTypeAny>(data: T) =>
    z.discriminatedUnion('ok', [
        z.object({ ok: z.literal(true), data }),
        z.object({ ok: z.literal(false), error: ProtocolErrorSchema })
    ]);
