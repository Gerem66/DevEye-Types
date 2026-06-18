import { z } from 'zod';

/**
 * A note's body is a modular list of typed blocks rather than free text. This
 * keeps the editor "à la Apple" (one clean surface) while still supporting
 * paragraphs and checklists in any order:
 *  - `text`  → a paragraph.
 *  - `check` → a checklist item, with its own `done` state.
 *
 * The shape is intentionally small and forward-compatible: adding a new block
 * kind later (heading, divider, …) only widens this union.
 */
export const noteTextBlockSchema = z.object({
    type: z.literal('text'),
    text: z.string()
});

export const noteCheckBlockSchema = z.object({
    type: z.literal('check'),
    text: z.string(),
    done: z.boolean()
});

export const noteBlockSchema = z.discriminatedUnion('type', [
    noteTextBlockSchema,
    noteCheckBlockSchema
]);

export type NoteTextBlock = z.infer<typeof noteTextBlockSchema>;
export type NoteCheckBlock = z.infer<typeof noteCheckBlockSchema>;
export type NoteBlock = z.infer<typeof noteBlockSchema>;

/** Upper bounds, enforced both client- and server-side, to keep rows sane. */
export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_FOLDER_MAX_LENGTH = 80;
export const NOTE_BLOCK_TEXT_MAX_LENGTH = 5_000;
export const NOTE_MAX_BLOCKS = 500;

/**
 * A folder is a first-class, server-persisted bucket. Its `name` is sensitive
 * and stored encrypted server-side; only the linkage (`folderId` on notes) is
 * kept in clear. `id` is stable across renames, so notes reference it directly.
 */
export const noteFolderSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().max(NOTE_FOLDER_MAX_LENGTH)
});

export type NoteFolder = z.infer<typeof noteFolderSchema>;

/**
 * A full note as exchanged with the client. `folderId` references a
 * {@link noteFolderSchema}; `null` means "no folder" (Sans dossier). `hidden`
 * notes require the session to be unlocked (master password / cached DEK)
 * before the server returns their content — see the note feature handlers.
 */
export const noteSchema = z.object({
    id: z.number().int().nonnegative(),
    title: z.string().max(NOTE_TITLE_MAX_LENGTH),
    folderId: z.number().int().positive().nullable(),
    blocks: z.array(noteBlockSchema).max(NOTE_MAX_BLOCKS),
    pinned: z.boolean(),
    hidden: z.boolean(),
    /** Epoch seconds; set by the server, surfaced for sorting/display. */
    updated: z.number().int().nonnegative(),
    /** Epoch seconds the note was first created. */
    created: z.number().int().nonnegative()
});

export type Note = z.infer<typeof noteSchema>;

/**
 * Lightweight list variant. Hidden notes that the session cannot read are
 * returned in this masked form: metadata only, no `blocks`, so the UI can show
 * a locked placeholder without ever decrypting the body.
 */
export const noteSummarySchema = z.object({
    id: z.number().int().nonnegative(),
    title: z.string(),
    folderId: z.number().int().positive().nullable(),
    pinned: z.boolean(),
    hidden: z.boolean(),
    /** Present only when the body is readable; absent for locked hidden notes. */
    preview: z.string().optional(),
    /** Total checklist items / how many are done — for an at-a-glance summary. */
    checkTotal: z.number().int().nonnegative(),
    checkDone: z.number().int().nonnegative(),
    /** True when this is a hidden note the session may not read yet. */
    locked: z.boolean(),
    updated: z.number().int().nonnegative(),
    /** Epoch seconds the note was first created. */
    created: z.number().int().nonnegative()
});

export type NoteSummary = z.infer<typeof noteSummarySchema>;

export interface NoteRow {
    id: number;
    user_id: number;
    workspace_id: number | null;
    folder_id: number | null;
    /** Encrypted JSON payload (title + blocks). */
    content: string;
    pinned: number;
    hidden: number;
    updated: number;
    created: number;
}

export interface NoteFolderRow {
    id: number;
    user_id: number;
    workspace_id: number | null;
    /** Encrypted JSON payload (`{ name }`). */
    content: string;
    created: number;
}
