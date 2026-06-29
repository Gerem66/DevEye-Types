import { z } from 'zod';
import { fileMutateOpSchema, fileSearchFilterSchema } from '../domain/deviceFiles';

const deviceId = z.uuid();
/** Correlates a request to its streamed result (results carry no requestId). */
const opId = z.string().min(1).max(64);
const path = z.string().min(1).max(4096);

/**
 * List a directory. Owner-or-admin + agent online. The listing arrives as a
 * `device.filesListing` push event keyed by `opId` (the caller must be subscribed).
 */
export const deviceFilesList = {
    command: 'device.filesList' as const,
    input: z.object({ deviceId, opId, path }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Analyse a directory's recursive disk usage (ncdu-style): the total size of each
 * immediate child. Result arrives as a `device.filesUsage` push event.
 */
export const deviceFilesAnalyze = {
    command: 'device.filesAnalyze' as const,
    input: z.object({ deviceId, opId, path }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Recursively search a directory with an advanced filter (name/extension/content,
 * date & size windows). Matches arrive as a `device.filesMatches` push event.
 */
export const deviceFilesSearch = {
    command: 'device.filesSearch' as const,
    input: z.object({ deviceId, opId, path, filter: fileSearchFilterSchema }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Mutate the filesystem: `delete` (file or directory, recursive), `mkdir`, or
 * `rename` (needs `dest`). The outcome arrives as a `device.filesOp` push event.
 */
export const deviceFilesMutate = {
    command: 'device.filesMutate' as const,
    input: z.object({ deviceId, opId, op: fileMutateOpSchema, path, dest: path.optional() }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Download a file. Bytes stream back as `device.filesChunk` push events keyed by
 * `opId` (base64, the last with `done: true`); the client reassembles them.
 */
export const deviceFilesDownload = {
    command: 'device.filesDownload' as const,
    input: z.object({ deviceId, opId, path }),
    output: z.object({ ok: z.boolean() })
};

/**
 * Upload one chunk of a file at `offset` (0 truncates/creates it). The completion
 * (on `done`) arrives as a `device.filesOp` push event (op `upload`).
 */
export const deviceFilesUpload = {
    command: 'device.filesUpload' as const,
    input: z.object({
        deviceId,
        opId,
        path,
        offset: z.number().int().nonnegative(),
        data: z.string().max(1_400_000),
        done: z.boolean()
    }),
    output: z.object({ ok: z.boolean() })
};

export const deviceFilesCommands = [
    deviceFilesList,
    deviceFilesAnalyze,
    deviceFilesSearch,
    deviceFilesMutate,
    deviceFilesDownload,
    deviceFilesUpload
] as const;
