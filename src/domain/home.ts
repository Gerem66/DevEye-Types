import { z } from 'zod';
import {
    externalFeatureIdSchema,
    featureIdSchema,
    isExternalFeatureId,
    type ExternalFeatureId,
    type FeatureId
} from './workspaceRole';

/**
 * Disposition de l'accueil (par espace) : des sections ordonnées, chacune
 * tenant des tuiles ordonnées de n'importe quels genres (appareil,
 * fonctionnalité, raccourci, dossier). Aucune section par défaut ; l'intitulé
 * est facultatif. Stockée en clair : métadonnée de personnalisation, jamais de
 * contenu utilisateur.
 */

/**
 * Les tuiles de fonctionnalités natives. Une tuile porte l'id de sa feature :
 * la tuile Monitoring est celle de la feature `devices`, dont le module
 * fournit la carte et la vue.
 */
export const nativeHomeFeatureIdSchema = z.enum([
    'devices',
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
    'backup',
    'finance',
    'audience',
    'osint',
    'cve',
    'mailserver',
    'convert'
]);
export type NativeHomeFeatureId = z.infer<typeof nativeHomeFeatureIdSchema>;

/**
 * Une tuile de fonctionnalité posable sur la grille : native, ou module externe
 * (préfixe `x-`, voir `workspaceRole.ts`). Surensemble pur : les dispositions
 * persistées parsent inchangées, et une tuile `x-` dont le module a disparu
 * parse aussi : la grille l'ignore au rendu tant que rien ne porte cet id.
 */
export const homeFeatureIdSchema = z.union([nativeHomeFeatureIdSchema, externalFeatureIdSchema]);
export type HomeFeatureId = NativeHomeFeatureId | ExternalFeatureId;

/**
 * Compact widgets pinned to the top-right of the navbar, individually
 * add/remove/reorderable; the default set is empty.
 *  - `weather`  → current temperature of the primary city.
 *  - `secrecy`  → password-encryption lock state + re-validation countdown.
 *  - `live`     → qui d'autre est dans l'espace, et où (bulles cliquables).
 *  - `publicIp` → l'adresse publique par laquelle CE navigateur sort.
 * A module's widget is declared by its manifest (`topbarWidget`) and keyed by
 * its feature id (`homeTopbarWidgetIdSchema`).
 */
export const nativeHomeTopbarWidgetIdSchema = z.enum(['weather', 'secrecy', 'live', 'publicIp']);
export type NativeHomeTopbarWidgetId = z.infer<typeof nativeHomeTopbarWidgetIdSchema>;

/**
 * Un module peut épingler SON widget de topbar : son id de feature sert d'id
 * de widget. Surensemble pur, comme les tuiles : les dispositions persistées
 * parsent inchangées, un id sans widget est ignoré au rendu.
 */
export const homeTopbarWidgetIdSchema = z.union([nativeHomeTopbarWidgetIdSchema, featureIdSchema]);
export type HomeTopbarWidgetId = NativeHomeTopbarWidgetId | FeatureId;

/**
 * Shortcut preview type, auto-detected from the URL's domain. Each value has a
 * server-side adapter under `src/Services/shortcutTemplates/`; `link` is the
 * generic Open Graph + favicon adapter, and unknown domains fall back to it.
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

/** Un lien épinglé par l'utilisateur : une tuile qui porte son propre objet. */
export const shortcutItemSchema = z.object({
    /** Stable client-generated id, used as the React / drag key. */
    id: z.string().min(1).max(64),
    /** Unknown/legacy templates degrade to a generic link rather than dropping the tile. */
    template: shortcutTemplateSchema.catch('link'),
    // http(s) seulement : `z.string().url()` accepte `javascript:` et `data:`, et
    // cette valeur devient le `href` d'une tuile.
    url: z.url({ protocol: /^https?$/ }).max(SHORTCUT_URL_MAX_LENGTH),
    /** Optional: empty → the tile falls back to the fetched name (account, og:title…). */
    title: z.string().max(80),
    description: z.string().max(200).optional(),
    /** Optional icon class name (e.g. `other`); falls back per template. */
    icon: z.string().max(40).optional()
});
export type ShortcutItem = z.infer<typeof shortcutItemSchema>;

/**
 * Plafonds d'une section et d'un dossier. Exportés parce que le client doit
 * refuser avant d'écrire : une disposition qui dépasse ne passe plus la
 * validation, et le client la relirait vide au démarrage suivant.
 */
export const HOME_SECTION_MAX_TILES = 60;
export const HOME_FOLDER_MAX_ITEMS = 20;

/**
 * Un dossier de la grille : plusieurs fonctionnalités derrière une seule tuile,
 * posée dans une section comme une tuile ordinaire. Il ne range que des
 * fonctionnalités (les autres tuiles sont déjà courtes), et celles qu'il tient
 * comptent comme posées sur l'accueil : une fonctionnalité n'est jamais à deux
 * endroits à la fois.
 */
export const homeFolderSchema = z.object({
    /** Discriminant : c'est lui qui distingue un dossier d'un raccourci. */
    kind: z.literal('folder'),
    /** Id stable généré par le client : clé React, id de glissé, cible des mutations. */
    id: z.string().min(1).max(64),
    /** Intitulé porté par la carte. Vide, l'affichage retombe sur « Dossier ». */
    title: z.string().max(40),
    items: z.array(homeFeatureIdSchema).max(HOME_FOLDER_MAX_ITEMS)
});
export type HomeFolder = z.infer<typeof homeFolderSchema>;

/**
 * Une tuile de l'accueil : appareil, fonctionnalité, raccourci ou dossier. Un
 * appareil et une fonctionnalité SONT leur identifiant ; un raccourci et un
 * dossier portent l'objet. Les deux familles d'identifiants ne se confondent
 * pas (enum fermé contre UUID), et {@link homeTileKind} tranche en un seul
 * endroit.
 */
export const homeTileSchema = z.union([
    homeFolderSchema,
    shortcutItemSchema,
    homeFeatureIdSchema,
    z.uuid()
]);
export type HomeTile = z.infer<typeof homeTileSchema>;

/** Ce que porte une tuile. Une seule lecture de la forme, partagée par tous. */
export type HomeTileKind = 'device' | 'feature' | 'shortcut' | 'folder';

/**
 * Les fonctionnalités **natives**, pour distinguer leur identifiant d'un id
 * d'appareil. Les externes se reconnaissent à leur préfixe (`isExternalFeatureId`),
 * pas à une liste : la liste dépend de l'installation, le préfixe non.
 */
export const HOME_FEATURE_IDS = nativeHomeFeatureIdSchema.options;

/**
 * Le genre d'une tuile. Le seul endroit qui connaisse la forme de l'union :
 * changer la représentation ne se paye qu'ici.
 */
export function homeTileKind(tile: HomeTile): HomeTileKind {
    if (typeof tile !== 'string') return 'kind' in tile ? 'folder' : 'shortcut';
    if (isExternalFeatureId(tile)) return 'feature';
    return (HOME_FEATURE_IDS as readonly string[]).includes(tile) ? 'feature' : 'device';
}

/** Cette tuile est-elle un dossier ? */
export function isHomeFolder(tile: HomeTile): tile is HomeFolder {
    return homeTileKind(tile) === 'folder';
}

/** Cette tuile est-elle un raccourci ? */
export function isShortcutTile(tile: HomeTile): tile is ShortcutItem {
    return homeTileKind(tile) === 'shortcut';
}

/** Cette tuile est-elle une fonctionnalité ? */
export function isFeatureTile(tile: HomeTile): tile is HomeFeatureId {
    return homeTileKind(tile) === 'feature';
}

/**
 * L'identité d'une tuile : sa clé React, son id de glissé, la cible des
 * mutations. Un raccourci et un dossier portent leur `id`, un appareil et une
 * fonctionnalité **sont** le leur.
 */
export function homeTileId(tile: HomeTile): string {
    return typeof tile === 'string' ? tile : tile.id;
}

/** Fields every section carries. */
const sectionBase = {
    /** Stable client-generated id: React key, drag id, and mutation target. */
    id: z.string().min(1).max(64),
    /** User-chosen heading; absent → the section renders untitled on the home. */
    title: z.string().max(40).optional(),
    /** The section can be folded away. Absent = always shown, no chevron. */
    collapsible: z.boolean().optional(),
    /**
     * Starts folded. Only meaningful alongside `collapsible`; the home enforces
     * the pairing rather than trusting the flag on its own.
     */
    collapsed: z.boolean().optional()
};

/**
 * Une section : une rangée ordonnée de tuiles de n'importe quels genres,
 * distinguée par son seul `id`. Une ligne peut mêler une carte de pleine
 * hauteur et des cartes courtes.
 */
export const homeSectionSchema = z.object({
    ...sectionBase,
    items: z.array(homeTileSchema).max(HOME_SECTION_MAX_TILES)
});
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
    imageUrl: z.url({ protocol: /^https?$/ }).nullable(),
    stats: z.array(z.object({ label: z.string(), value: z.string() })).max(4),
    /**
     * Optional live/online status, rendered as a small green/red dot in the tile
     * corner (e.g. Twitch live vs offline). Omitted when not applicable.
     */
    status: z.enum(['online', 'offline']).optional()
});
export type ShortcutPreview = z.infer<typeof shortcutPreviewSchema>;
