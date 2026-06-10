import { z } from 'zod';

export const ErrorCodeSchema = z.enum([
    'auth_required',
    'auth_invalid',
    'auth_expired',
    'forbidden',
    'not_found',
    'conflict',
    'validation',
    'rate_limited',
    'internal',
    'unsupported_version'
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ProtocolErrorSchema = z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional()
});

export type ProtocolError = z.infer<typeof ProtocolErrorSchema>;
