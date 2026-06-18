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
    hidden: z.boolean()
});

/**
 * List notes for a workspace. Returns summaries; hidden notes the session can't
 * read come back `locked` (metadata only). Never throws `locked` itself — the
 * caller decides whether to unlock and refetch the full note.
 */
export const noteList = {
    command: 'note.list' as const,
    input: z.object({ workspaceId }),
    output: z.object({ notes: z.array(noteSummarySchema) })
};

/**
 * Fetch one note in full. For a hidden note this requires the session to be
 * unlocked; otherwise the server replies `locked` and the client prompts.
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

export const noteEdit = {
    command: 'note.edit' as const,
    input: z.object({ workspaceId, noteId: z.number().int().positive(), note: noteDraftSchema }),
    output: z.object({ note: noteSchema })
};

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

/**
 * Authorize this session to read hidden notes ("root auth"). Accepts the
 * account/master password. When password-based encryption is enabled and the
 * session is already unlocked (cached DEK), `password` may be empty: being
 * unlocked is itself proof. Returns whether hidden notes are now revealed.
 */
export const noteReveal = {
    command: 'note.reveal' as const,
    input: z.object({ password: z.string() }),
    output: z.object({ revealed: z.literal(true) })
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
    noteGet,
    noteAdd,
    noteEdit,
    noteDelete,
    noteMove,
    noteReveal,
    folderList,
    folderAdd,
    folderRename,
    folderReorder,
    folderDelete
] as const;
