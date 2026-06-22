import { z } from 'zod';
import {
    NOTE_FOLDER_MAX_LENGTH,
    NOTE_MAX_BLOCKS,
    NOTE_TITLE_MAX_LENGTH,
    noteBlockSchema,
    noteFolderSchema,
    noteSchema,
    noteSummarySchema
} from '../domain/note';

const workspaceId = z.number().int().nonnegative();
const folderId = z.number().int().positive();

/**
 * How a save should affect the note's lock:
 *  - omitted        → leave the lock as-is (content-only edit).
 *  - `{ set: pwd }`  → (re)lock the note with this dedicated password.
 *  - `{ remove: true }` → remove the lock (note becomes open).
 */
const lockChangeSchema = z.union([
    z.object({ set: z.string().min(1) }),
    z.object({ remove: z.literal(true) })
]);

/** The editable shape of a note — everything the client may set. */
const noteDraftSchema = z.object({
    title: z.string().max(NOTE_TITLE_MAX_LENGTH),
    folderId: folderId.nullable(),
    blocks: z.array(noteBlockSchema).max(NOTE_MAX_BLOCKS),
    pinned: z.boolean(),
    /** Optional change to the note's lock; omit to leave it unchanged. */
    lock: lockChangeSchema.optional()
});

/**
 * List notes for a workspace. Returns summaries; locked notes come back masked
 * (metadata only, `locked: true`) — the caller prompts for the note's dedicated
 * password and refetches the full note via `note.get` when the user opens it.
 */
export const noteList = {
    command: 'note.list' as const,
    input: z.object({ workspaceId }),
    output: z.object({ notes: z.array(noteSummarySchema) })
};

/**
 * Count the caller's notes in a workspace. Pure clear metadata: every row is
 * counted the same way — locked notes included, no special case — without
 * decrypting anything. Unlike `note.list` this never requires the password
 * encryption layer to be unlocked, so the dashboard widget always shows a
 * number, even when the session is locked.
 */
export const noteCount = {
    command: 'note.count' as const,
    input: z.object({ workspaceId }),
    output: z.object({ count: z.number().int().nonnegative() })
};

/**
 * Fetch one note in full. For a locked note the caller must supply the note's
 * dedicated `password`; otherwise the server replies `auth_required` and the
 * client prompts. The password is verified on every open (no session reveal).
 */
export const noteGet = {
    command: 'note.get' as const,
    input: z.object({
        workspaceId,
        noteId: z.number().int().positive(),
        password: z.string().optional()
    }),
    output: z.object({ note: noteSchema })
};

export const noteAdd = {
    command: 'note.add' as const,
    input: z.object({ workspaceId, note: noteDraftSchema }),
    output: z.object({ note: noteSchema })
};

/**
 * Edit a note. For a currently-locked note the caller must supply its existing
 * `password` (proof it was legitimately opened); `note.lock` may then change or
 * remove the lock. Open notes need no password.
 */
export const noteEdit = {
    command: 'note.edit' as const,
    input: z.object({
        workspaceId,
        noteId: z.number().int().positive(),
        note: noteDraftSchema,
        password: z.string().optional()
    }),
    output: z.object({ note: noteSchema })
};

/**
 * Delete a note. A locked note is destructive to remove, so its dedicated
 * `password` is required; moving it (benign) is not gated. Open notes need no
 * password.
 */
export const noteDelete = {
    command: 'note.delete' as const,
    input: z.object({
        workspaceId,
        noteId: z.number().int().positive(),
        password: z.string().optional()
    }),
    output: z.object({ noteId: z.number().int().positive() })
};

/**
 * Move a note into a folder (or out of one with `folderId: null`). A lightweight
 * relocation that doesn't touch the encrypted body — used by the move menu and
 * drag & drop.
 */
export const noteMove = {
    command: 'note.move' as const,
    input: z.object({
        workspaceId,
        noteId: z.number().int().positive(),
        folderId: folderId.nullable()
    }),
    output: z.object({ noteId: z.number().int().positive(), folderId: folderId.nullable() })
};

/** List the caller's folders for a workspace (names decrypted server-side). */
export const folderList = {
    command: 'folder.list' as const,
    input: z.object({ workspaceId }),
    output: z.object({ folders: z.array(noteFolderSchema) })
};

export const folderAdd = {
    command: 'folder.add' as const,
    input: z.object({ workspaceId, name: z.string().min(1).max(NOTE_FOLDER_MAX_LENGTH) }),
    output: z.object({ folder: noteFolderSchema })
};

export const folderRename = {
    command: 'folder.rename' as const,
    input: z.object({ workspaceId, folderId, name: z.string().min(1).max(NOTE_FOLDER_MAX_LENGTH) }),
    output: z.object({ folder: noteFolderSchema })
};

/**
 * Reorder all of the caller's folders for a workspace; `folderIds` is the new
 * full order (lower index = listed first). Used by the move up/down controls.
 */
export const folderReorder = {
    command: 'folder.reorder' as const,
    input: z.object({ workspaceId, folderIds: z.array(folderId).min(1) }),
    output: z.object({ folders: z.array(noteFolderSchema) })
};

/** Delete a folder; its notes are un-filed (folderId → null), not destroyed. */
export const folderDelete = {
    command: 'folder.delete' as const,
    input: z.object({ workspaceId, folderId }),
    output: z.object({ folderId })
};

export const noteCommands = [
    noteList,
    noteCount,
    noteGet,
    noteAdd,
    noteEdit,
    noteDelete,
    noteMove,
    folderList,
    folderAdd,
    folderRename,
    folderReorder,
    folderDelete
] as const;
