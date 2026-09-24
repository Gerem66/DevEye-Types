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
    // The account's plan does not allow one more of what the command creates.
    // `details` carries `{ feature, key, limit, plan }`.
    'quota_exceeded',
    'internal',
    'unsupported_version',
    // Password-based encryption is enabled but the session has not yet been
    // unlocked with the user's password. The client should prompt for it.
    'locked',
    // The site, or the feature the command belongs to, is under maintenance
    // (see `domain/maintenance.ts`). The message is the one to show.
    'maintenance'
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ProtocolErrorSchema = z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional()
});

export type ProtocolError = z.infer<typeof ProtocolErrorSchema>;
