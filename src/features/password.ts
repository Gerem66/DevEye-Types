import { z } from 'zod';
import { passwordEntryMaskedSchema, passwordEntrySchema } from '../domain/password';

const workspaceId = z.number().int().nonnegative();

export const passwordList = {
    command: 'password.list' as const,
    input: z.object({ workspaceId }),
    output: z.object({ entries: z.array(passwordEntryMaskedSchema) })
};

/**
 * Count the caller's password entries in a workspace. Clear metadata only (row
 * count, no decryption), so — unlike `password.list` — it never requires the
 * password encryption layer to be unlocked and the dashboard widget always
 * renders a number, even when the session is locked.
 */
export const passwordCount = {
    command: 'password.count' as const,
    input: z.object({ workspaceId }),
    output: z.object({ count: z.number().int().nonnegative() })
};

export const passwordGet = {
    command: 'password.get' as const,
    input: z.object({ workspaceId, passwordId: z.number().int().positive() }),
    output: z.object({ entry: passwordEntrySchema })
};

export const passwordAdd = {
    command: 'password.add' as const,
    input: z.object({
        workspaceId,
        entry: passwordEntrySchema.omit({ id: true })
    }),
    output: z.object({ entry: passwordEntrySchema })
};

export const passwordEdit = {
    command: 'password.edit' as const,
    input: z.object({ workspaceId, entry: passwordEntrySchema }),
    output: z.object({ entry: passwordEntrySchema })
};

export const passwordDelete = {
    command: 'password.delete' as const,
    input: z.object({ workspaceId, passwordId: z.number().int().positive() }),
    output: z.object({ passwordId: z.number().int().positive() })
};

export const passwordUnlock = {
    command: 'password.unlock' as const,
    input: z.object({ workspaceId, password: z.string().min(1) }),
    output: z.object({ unlocked: z.literal(true) })
};

export const passwordCommands = [
    passwordList,
    passwordCount,
    passwordGet,
    passwordAdd,
    passwordEdit,
    passwordDelete,
    passwordUnlock
] as const;
