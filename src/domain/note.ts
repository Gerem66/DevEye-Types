import { z } from 'zod';

/**
 * A note's body is a modular list of typed blocks rather than free text. This
 * keeps the editor "à la Apple" (one clean surface) while still supporting
 * paragraphs and checklists in any order:
 *  - `text`  → a paragraph.
 *  - `check` → a checklist item, with its own `done` state.
 *
 *  - `bullet` → a bulleted (unordered) list item.
 *  - `number` → a numbered (ordered) list item; its visible index is derived
 *    from its position in the run of consecutive `number` blocks (not stored).
 *  - `heading` → a section title, `level` 1 (largest) to 5 (smallest).
 *  - `divider` → a horizontal separator; carries no text.
 *
 * Inline emphasis (bold `**`, italic `*`, underline `__`, strikethrough `~~`)
 * is kept as markdown markers inside a block's `text`, not as separate blocks.
 *
 * The shape is intentionally small and forward-compatible: adding a new block
 * kind later (heading, divider, …) only widens this union.
 */
/**
 * Named colour palette shared by the two colouring features:
 *  - inline text colour, carried as `{c:name}…{/c}` markers inside a block's
 *    `text` (so it lives in the freeform string, not the schema);
 *  - the block-level `color` below, which tints a marker (bullet dot, ordinal,
 *    checkbox, divider rule).
 *
 * A *named* palette (not a free hex) keeps the stored value tied to a theme
 * token (`--note-<name>`), so colours stay coherent with the app's design and
 * adapt if the palette is retuned. Widen this enum to add a colour.
 */
export const noteColorSchema = z.enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple']);

export type NoteColor = z.infer<typeof noteColorSchema>;

export const noteTextBlockSchema = z.object({
    type: z.literal('text'),
    text: z.string()
});

export const noteCheckBlockSchema = z.object({
    type: z.literal('check'),
    text: z.string(),
    done: z.boolean(),
    /** Optional tint for the checkbox marker (theme token `--note-<color>`). */
    color: noteColorSchema.optional()
});

export const noteBulletBlockSchema = z.object({
    type: z.literal('bullet'),
    text: z.string(),
    /** Optional tint for the bullet dot (theme token `--note-<color>`). */
    color: noteColorSchema.optional()
});

export const noteNumberBlockSchema = z.object({
    type: z.literal('number'),
    text: z.string(),
    /** Optional tint for the ordinal marker (theme token `--note-<color>`). */
    color: noteColorSchema.optional()
});

export const noteHeadingBlockSchema = z.object({
    type: z.literal('heading'),
    text: z.string(),
    /** Heading level, 1 (largest) to 5 (smallest). */
    level: z.number().int().min(1).max(5)
});

export const noteDividerBlockSchema = z.object({
    type: z.literal('divider'),
    /** Optional tint for the horizontal rule (theme token `--note-<color>`). */
    color: noteColorSchema.optional()
});

export const noteBlockSchema = z.discriminatedUnion('type', [
    noteTextBlockSchema,
    noteCheckBlockSchema,
    noteBulletBlockSchema,
    noteNumberBlockSchema,
    noteHeadingBlockSchema,
    noteDividerBlockSchema
]);

export type NoteTextBlock = z.infer<typeof noteTextBlockSchema>;
export type NoteCheckBlock = z.infer<typeof noteCheckBlockSchema>;
export type NoteBulletBlock = z.infer<typeof noteBulletBlockSchema>;
export type NoteNumberBlock = z.infer<typeof noteNumberBlockSchema>;
export type NoteHeadingBlock = z.infer<typeof noteHeadingBlockSchema>;
export type NoteDividerBlock = z.infer<typeof noteDividerBlockSchema>;
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
    name: z.string().max(NOTE_FOLDER_MAX_LENGTH),
    /** Rank within the user's folders; lower comes first. Manually reorderable. */
    sortOrder: z.number().int().nonnegative()
});

export type NoteFolder = z.infer<typeof noteFolderSchema>;

/**
 * A full note as exchanged with the client. `folderId` references a
 * {@link noteFolderSchema}; `null` means "no folder" (Sans dossier). `locked`
 * notes carry their own dedicated password: reading (and deleting) one requires
 * that password, checked per open — see the note feature handlers. The lock is
 * an access gate only; the body stays encrypted by the SecureStore regardless.
 */
export const noteSchema = z.object({
    id: z.number().int().nonnegative(),
    title: z.string().max(NOTE_TITLE_MAX_LENGTH),
    folderId: z.number().int().positive().nullable(),
    blocks: z.array(noteBlockSchema).max(NOTE_MAX_BLOCKS),
    pinned: z.boolean(),
    /** True when the note is protected by its own dedicated password. */
    locked: z.boolean(),
    /** Epoch seconds; set by the server, surfaced for sorting/display. */
    updated: z.number().int().nonnegative(),
    /** Epoch seconds the note was first created. */
    created: z.number().int().nonnegative()
});

export type Note = z.infer<typeof noteSchema>;

/**
 * Lightweight list variant. A `locked` note is always returned masked here —
 * metadata only, no `title`/`blocks` — so the UI shows a padlock placeholder
 * without ever decrypting the body or revealing the title before the per-note
 * password is entered.
 */
export const noteSummarySchema = z.object({
    id: z.number().int().nonnegative(),
    title: z.string(),
    folderId: z.number().int().positive().nullable(),
    pinned: z.boolean(),
    /** Present only when the body is readable; absent for locked notes. */
    preview: z.string().optional(),
    /** Total checklist items / how many are done — for an at-a-glance summary. */
    checkTotal: z.number().int().nonnegative(),
    checkDone: z.number().int().nonnegative(),
    /** True when this is a locked note (its dedicated password is required). */
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
    /** argon2 hash of the note's dedicated password; NULL when not locked. */
    lock_hash: string | null;
    updated: number;
    created: number;
}

export interface NoteFolderRow {
    id: number;
    user_id: number;
    workspace_id: number | null;
    /** Encrypted JSON payload (`{ name }`). */
    content: string;
    /** Manual rank within the user's folders; lower comes first. */
    sort_order: number;
    created: number;
}
