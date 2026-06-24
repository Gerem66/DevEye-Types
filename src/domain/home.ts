import { z } from 'zod';

/**
 * Home dashboard layout (per-user). The grid is composed from ordered
 * **categories**, each holding ordered tiles of a single kind. In normal mode
 * the categories render as lightly-spaced groups (no titles); in edit mode each
 * shows its title and its tiles are drag-sortable within the category.
 *
 * Stored in clear as non-sensitive personalization metadata (like the theme),
 * never zero-knowledge payload.
 */

/** Built-in feature widgets that can be placed on the grid. */
export const homeFeatureIdSchema = z.enum(['monitoring', 'weather', 'password', 'notes']);
export type HomeFeatureId = z.infer<typeof homeFeatureIdSchema>;

/**
 * Shortcut preview type, auto-detected from the URL's domain (the user never
 * picks it manually). Each value has a server-side adapter under
 * `src/Services/shortcutTemplates/` — dedicated logic where a real source exists
 * (GitHub API, YouTube/Spotify/SoundCloud/TikTok oEmbed, Wikipedia REST, npm
 * registry), and the generic Open Graph + favicon adapter for the rest. `link`
 * is that generic adapter; unknown domains fall back to it.
 */
export const shortcutTemplateSchema = z.enum([
    'link',
    'github',
    'youtube',
    'twitch',
    'twitter',
    'instagram',
    'tiktok',
    'reddit',
    'linkedin',
    'spotify',
    'soundcloud',
    'discord',
    'wikipedia',
    'medium',
    'npm',
    'dribbble',
    'pinterest',
    'facebook'
]);
export type ShortcutTemplate = z.infer<typeof shortcutTemplateSchema>;

/** Max length of a shortcut URL kept in the layout. */
export const SHORTCUT_URL_MAX_LENGTH = 2048;

/** A user-pinned link tile (the shortcut category carries these objects). */
export const shortcutItemSchema = z.object({
    /** Stable client-generated id, used as the React / drag key. */
    id: z.string().min(1).max(64),
    /** Unknown/legacy templates degrade to a generic link rather than dropping the tile. */
    template: shortcutTemplateSchema.catch('link'),
    url: z.string().url().max(SHORTCUT_URL_MAX_LENGTH),
    /** Optional: empty → the tile falls back to the fetched name (account, og:title…). */
    title: z.string().max(80),
    description: z.string().max(200).optional(),
    /** Optional icon class name (e.g. `other`); falls back per template. */
    icon: z.string().max(40).optional()
});
export type ShortcutItem = z.infer<typeof shortcutItemSchema>;

/** Category discriminator; also the kind of tiles a category holds. */
export const homeCategoryKindSchema = z.enum(['device', 'feature', 'shortcut']);
export type HomeCategoryKind = z.infer<typeof homeCategoryKindSchema>;

/**
 * One category: an ordered set of tiles of a single kind. Device/feature
 * categories store plain ids (the entity lives elsewhere); the shortcut category
 * stores the link objects themselves. A kind appears at most once.
 */
export const homeCategorySchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('device'), items: z.array(z.string().uuid()).max(60) }),
    z.object({ kind: z.literal('feature'), items: z.array(homeFeatureIdSchema).max(20) }),
    z.object({ kind: z.literal('shortcut'), items: z.array(shortcutItemSchema).max(60) })
]);
export type HomeCategory = z.infer<typeof homeCategorySchema>;

export const homeLayoutSchema = z.object({
    categories: z.array(homeCategorySchema).max(8)
});
export type HomeLayout = z.infer<typeof homeLayoutSchema>;

/**
 * Normalized preview returned for a rich shortcut template, so the client has a
 * single renderer regardless of the source. `ok: false` means the source could
 * not be fetched/parsed — the tile still works as a plain link.
 */
export const shortcutPreviewSchema = z.object({
    ok: z.boolean(),
    title: z.string().nullable(),
    subtitle: z.string().nullable(),
    imageUrl: z.string().url().nullable(),
    stats: z.array(z.object({ label: z.string(), value: z.string() })).max(4)
});
export type ShortcutPreview = z.infer<typeof shortcutPreviewSchema>;
