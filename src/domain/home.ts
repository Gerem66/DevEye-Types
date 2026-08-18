import { z } from 'zod';

/**
 * Home dashboard layout (per-user). The grid is composed from ordered
 * **sections**, each holding ordered tiles of a single kind. Sections are fully
 * modular: none by default, the user adds/removes/reorders them freely and may
 * have several of the same kind. A section's title is optional — without one it
 * renders as a bare, lightly-spaced group (no heading) on the home.
 *
 * Stored in clear as non-sensitive personalization metadata (like the theme),
 * never zero-knowledge payload.
 */

/** Built-in feature widgets that can be placed on the grid. */
export const homeFeatureIdSchema = z.enum([
    'monitoring',
    'sentinel',
    'weather',
    'password',
    'notes',
    'cloudsync',
    'uptime',
    'mail',
    'projects',
    'git',
    'deploy',
    'database',
    'finance',
    'audience',
    'osint'
]);
export type HomeFeatureId = z.infer<typeof homeFeatureIdSchema>;

/**
 * Compact widgets that can be pinned to the top-right of the navbar. Like the
 * grid features they are individually add/remove/reorderable; the default set is
 * empty (the navbar shows none until the user adds some).
 *  - `weather`  → current temperature of the primary city.
 *  - `devices`  → online / total device count.
 *  - `secrecy`  → password-encryption lock state + re-validation countdown.
 *  - `uptime`   → services up / total monitored.
 *  - `live`     → qui d'autre est dans l'espace, et où (bulles cliquables).
 */
export const homeTopbarWidgetIdSchema = z.enum(['weather', 'devices', 'secrecy', 'uptime', 'live']);
export type HomeTopbarWidgetId = z.infer<typeof homeTopbarWidgetIdSchema>;

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

/** A user-pinned link tile (shortcut sections carry these objects). */
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

/**
 * Combien de tuiles tient une section de fonctionnalités, et combien de
 * fonctionnalités tient un dossier.
 *
 * Exporté, et pas seulement écrit dans le schéma : le client doit refuser
 * **avant** d'écrire. Une disposition qui dépasse le plafond ne passe plus la
 * validation, donc le serveur la rejette et le client la relit vide au
 * démarrage suivant, ce qui revient à un accueil effacé sans un mot. Le
 * plafond des dossiers n'est atteignable par aucun geste (il y a moins de
 * fonctionnalités que ça, et aucune ne peut être rangée deux fois), celui des
 * tuiles l'est en créant des dossiers à la chaîne.
 */
export const HOME_SECTION_MAX_TILES = 20;
export const HOME_FOLDER_MAX_ITEMS = 20;

/**
 * Un dossier de la grille : plusieurs fonctionnalités derrière une seule tuile.
 *
 * Il vit dans une section « fonctionnalités », au milieu des tuiles ordinaires,
 * parce que c'en est une : même carte, même place dans la grille, même
 * glisser-déposer. Ce qui change est ce qui se passe au clic (côté client, les
 * cartes qu'il tient se déploient par-dessus l'accueil).
 *
 * Les fonctionnalités qu'il tient comptent comme **posées sur l'accueil** : le
 * sélecteur d'ajout les exclut, exactement comme celles qui ont leur propre
 * tuile. Une fonctionnalité n'est donc jamais à deux endroits à la fois, et la
 * règle « pas deux fois la même » reste une seule règle.
 */
export const homeFolderSchema = z.object({
    /** Discriminant de l'union : c'est lui qui distingue un dossier d'un identifiant. */
    kind: z.literal('folder'),
    /** Id stable généré par le client : clé React, id de glissé, cible des mutations. */
    id: z.string().min(1).max(64),
    /** Intitulé porté par la carte. Vide, l'affichage retombe sur « Dossier ». */
    title: z.string().max(40),
    items: z.array(homeFeatureIdSchema).max(HOME_FOLDER_MAX_ITEMS)
});
export type HomeFolder = z.infer<typeof homeFolderSchema>;

/**
 * Une tuile de section « fonctionnalités » : un identifiant de fonctionnalité,
 * ou un dossier qui en tient plusieurs.
 *
 * Une union avec la chaîne nue, et non un objet unique : les dispositions déjà
 * enregistrées ne portent que des chaînes, et elles restent valides telles
 * quelles. Rien à migrer côté base, rien à rattraper au chargement.
 */
export const homeFeatureTileSchema = z.union([homeFeatureIdSchema, homeFolderSchema]);
export type HomeFeatureTile = z.infer<typeof homeFeatureTileSchema>;

/**
 * Cette tuile est-elle un dossier ?
 *
 * Le seul endroit qui connaisse la forme de l'union : tout le reste passe par
 * cette garde, donc changer la représentation ne se paye qu'ici.
 */
export function isHomeFolder(tile: HomeFeatureTile): tile is HomeFolder {
    return typeof tile !== 'string';
}

/** Section discriminator; also the kind of tiles a section holds. */
export const homeSectionKindSchema = z.enum(['device', 'feature', 'shortcut']);
export type HomeSectionKind = z.infer<typeof homeSectionKindSchema>;

/** Fields every section carries, whatever its kind. */
const sectionBase = {
    /** Stable client-generated id: React key, drag id, and mutation target. */
    id: z.string().min(1).max(64),
    /** User-chosen heading; absent → the section renders untitled on the home. */
    title: z.string().max(40).optional(),
    /**
     * The section can be folded away from the home.
     *
     * Absent (the default) → it always shows, and there is nothing to click:
     * a chevron on a section nobody wants to fold is one more thing to ignore.
     */
    collapsible: z.boolean().optional(),
    /**
     * It starts folded.
     *
     * Only meaningful alongside `collapsible` — a section that cannot be
     * unfolded but starts folded would simply be invisible. The home enforces
     * that pairing rather than trusting the flag on its own.
     */
    collapsed: z.boolean().optional()
};

/**
 * One section: an ordered set of tiles of a single kind. Device sections store
 * plain ids (the entity lives elsewhere); a feature section stores ids too, or a
 * folder object holding several of them; shortcut sections store the link
 * objects themselves. Several sections may share a kind — the `id` is what
 * identifies them.
 */
export const homeSectionSchema = z.discriminatedUnion('kind', [
    z.object({ ...sectionBase, kind: z.literal('device'), items: z.array(z.uuid()).max(60) }),
    z.object({
        ...sectionBase,
        kind: z.literal('feature'),
        items: z.array(homeFeatureTileSchema).max(HOME_SECTION_MAX_TILES)
    }),
    z.object({
        ...sectionBase,
        kind: z.literal('shortcut'),
        items: z.array(shortcutItemSchema).max(60)
    })
]);
export type HomeSection = z.infer<typeof homeSectionSchema>;

export const homeLayoutSchema = z.object({
    /** Navbar mini-widgets — not a grid section, edited in the navbar itself. */
    topbar: z.array(homeTopbarWidgetIdSchema).max(10),
    /** Ordered grid sections. Empty by default: a fresh home shows none. */
    sections: z.array(homeSectionSchema).max(12)
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
    stats: z.array(z.object({ label: z.string(), value: z.string() })).max(4),
    /**
     * Optional live/online status, rendered as a small green/red dot in the tile
     * corner (e.g. Twitch live vs offline). Omitted when not applicable.
     */
    status: z.enum(['online', 'offline']).optional()
});
export type ShortcutPreview = z.infer<typeof shortcutPreviewSchema>;
