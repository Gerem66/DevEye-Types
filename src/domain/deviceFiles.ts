import { z } from 'zod';

/**
 * Device file explorer — entities shared by the agent, server and client.
 *
 * A graphical, ncdu-flavoured browser over the device filesystem: list a
 * directory, analyse recursive disk usage, search (name/extension/content + date
 * & size windows), and clean up (delete / mkdir / rename). All paths are absolute
 * on the device; the agent operates with its own privileges.
 */

export const fileKindSchema = z.enum(['file', 'dir', 'symlink', 'other']);
export type FileKind = z.infer<typeof fileKindSchema>;

/** One directory entry (shallow — `size` is the entry's own size, not recursive). */
export const fileEntrySchema = z.object({
    name: z.string(),
    kind: fileKindSchema,
    /** Own size in bytes (file content; a directory's own inode size). */
    size: z.number().int().nonnegative(),
    /** Last-modified, unix milliseconds (null when unavailable). */
    mtime: z.number().int().nullable(),
    /** Unix permission bits for display (e.g. 0o644); null on platforms without. */
    mode: z.number().int().nullable(),
    /** Link target for symlinks. */
    symlinkTarget: z.string().nullable().optional()
});
export type FileEntry = z.infer<typeof fileEntrySchema>;

/** A directory listing: the resolved path, its parent, and the entries. */
export const fileListingSchema = z.object({
    path: z.string(),
    parent: z.string().nullable(),
    entries: z.array(fileEntrySchema)
});
export type FileListing = z.infer<typeof fileListingSchema>;

/** One child's recursive size (the ncdu view). `partial` = the walk budget was hit. */
export const fileUsageEntrySchema = z.object({
    name: z.string(),
    kind: fileKindSchema,
    totalSize: z.number().int().nonnegative(),
    partial: z.boolean()
});
export type FileUsageEntry = z.infer<typeof fileUsageEntrySchema>;

/** One search hit. `preview` is the matching line for a content search. */
export const fileMatchSchema = z.object({
    path: z.string(),
    name: z.string(),
    kind: fileKindSchema,
    size: z.number().int().nonnegative(),
    mtime: z.number().int().nullable(),
    preview: z.string().max(500).nullable().optional()
});
export type FileMatch = z.infer<typeof fileMatchSchema>;

/** What a search query matches against. */
export const fileSearchFieldSchema = z.enum(['name', 'extension', 'content']);
export type FileSearchField = z.infer<typeof fileSearchFieldSchema>;

export const FILE_SEARCH_MAX = 2000;

/** Advanced search surface (all optional, combined as AND). */
export const fileSearchFilterSchema = z.object({
    /** The text to look for (interpreted per `field`; empty = match all, e.g. for a pure date/size filter). */
    query: z.string().max(500).optional(),
    /** Where to look: file name (default), extension, or file content (grep). */
    field: fileSearchFieldSchema.optional(),
    /** Treat `query` as a regular expression (name/content only). */
    regex: z.boolean().optional(),
    /** Modified at/after, unix epoch seconds. */
    since: z.number().int().nonnegative().optional(),
    /** Modified at/before, unix epoch seconds. */
    until: z.number().int().nonnegative().optional(),
    /** Size floor / ceiling in bytes. */
    minSize: z.number().int().nonnegative().optional(),
    maxSize: z.number().int().nonnegative().optional()
});
export type FileSearchFilter = z.infer<typeof fileSearchFilterSchema>;

/** A filesystem mutation. `rename` also needs `dest`. */
export const fileMutateOpSchema = z.enum(['delete', 'mkdir', 'rename']);
export type FileMutateOp = z.infer<typeof fileMutateOpSchema>;
