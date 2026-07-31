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

/** The editable shape of a note — everything the client may set. */
const noteDraftSchema = z.object({
    title: z.string().max(NOTE_TITLE_MAX_LENGTH),
    folderId: folderId.nullable(),
    blocks: z.array(noteBlockSchema).max(NOTE_MAX_BLOCKS),
    pinned: z.boolean(),
    /** Encrypt the body with the password-protected key rather than the open one. */
    private: z.boolean()
});

/**
 * List notes for a workspace. Never gated: regular notes are decrypted with the
 * open key, and private notes come back **masked** (metadata only,
 * `masked: true`) while the session is locked. Unlocking and re-listing reveals
 * them — no per-command password is involved.
 */
export const noteList = {
    command: 'note.list' as const,
    input: z.object({ workspaceId }),
    output: z.object({ notes: z.array(noteSummarySchema) })
};

/**
 * Count the caller's notes in a workspace. Pure clear metadata: every row is
 * counted the same way — private notes included, no special case — without
 * decrypting anything, so the dashboard widget always shows a number even when
 * the session is locked.
 */
export const noteCount = {
    command: 'note.count' as const,
    input: z.object({ workspaceId }),
    output: z.object({ count: z.number().int().nonnegative() })
};

/**
 * Fetch one note in full. A private note requires the session to be unlocked;
 * otherwise the server replies `locked` and the client opens the usual unlock
 * prompt before retrying.
 */
export const noteGet = {
    command: 'note.get' as const,
    input: z.object({ workspaceId, noteId: z.number().int().positive() }),
    output: z.object({ note: noteSchema })
};

export const noteAdd = {
    command: 'note.add' as const,
    input: z.object({ workspaceId, note: noteDraftSchema }),
    output: z.object({ note: noteSchema })
};

/**
 * Edit a note. Touching a note that is (or becomes) private requires the session
 * to be unlocked; the draft's `private` flag decides which key the new body is
 * written with, so flipping it re-encrypts the note into the other tier.
 */
export const noteEdit = {
    command: 'note.edit' as const,
    input: z.object({
        workspaceId,
        noteId: z.number().int().positive(),
        note: noteDraftSchema
    }),
    output: z.object({ note: noteSchema })
};

/**
 * Delete a note. Destroying a private note requires the session to be unlocked;
 * moving it (benign) is not gated.
 */
export const noteDelete = {
    command: 'note.delete' as const,
    input: z.object({ workspaceId, noteId: z.number().int().positive() }),
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
