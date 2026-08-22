import { z } from 'zod';
import {
    externalFeatureIdSchema,
    featureIdSchema,
    isExternalFeatureId,
    type ExternalFeatureId,
    type FeatureId
} from './workspaceRole';

/**
 * Disposition de l'accueil (par espace). La grille est composée de **sections**
 * ordonnées, chacune tenant des **tuiles** ordonnées de n'importe quels genres —
 * appareil, fonctionnalité, raccourci, dossier. Les sections sont entièrement
 * modulaires : aucune par défaut, ajoutées / retirées / réordonnées librement.
 * Leur intitulé est facultatif — sans lui, la section se rend comme un simple
 * groupe légèrement espacé, sans titre.
 *
 * Stockée en clair : métadonnée de personnalisation non sensible (comme le
 * thème), jamais de charge zero-knowledge.
 */

/** Les seize tuiles de fonctionnalités natives. */
export const nativeHomeFeatureIdSchema = z.enum([
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
    'backup',
    'finance',
    'audience',
    'osint'
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
 * Compact widgets that can be pinned to the top-right of the navbar. Like the
 * grid features they are individually add/remove/reorderable; the default set is
 * empty (the navbar shows none until the user adds some).
 *  - `weather`  → current temperature of the primary city.
 *  - `devices`  → online / total device count.
 *  - `secrecy`  → password-encryption lock state + re-validation countdown.
 *  - `uptime`   → services up / total monitored.
 *  - `live`     → qui d'autre est dans l'espace, et où (bulles cliquables).
 */
export const nativeHomeTopbarWidgetIdSchema = z.enum([
    'weather',
    'devices',
    'secrecy',
    'uptime',
    'live'
]);
export type NativeHomeTopbarWidgetId = z.infer<typeof nativeHomeTopbarWidgetIdSchema>;

/**
 * Un module peut épingler SON widget de topbar : son id de feature sert d'id
 * de widget. Surensemble pur, comme les tuiles : les dispositions persistées
 * parsent inchangées, un id sans widget est ignoré au rendu.
 */
export const homeTopbarWidgetIdSchema = z.union([nativeHomeTopbarWidgetIdSchema, featureIdSchema]);
export type HomeTopbarWidgetId = NativeHomeTopbarWidgetId | FeatureId;

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

/** Un lien épinglé par l'utilisateur : une tuile qui porte son propre objet. */
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
 * Combien de tuiles tient une section, et combien de fonctionnalités tient un
 * dossier.
 *
 * Exporté, et pas seulement écrit dans le schéma : le client doit refuser
 * **avant** d'écrire. Une disposition qui dépasse le plafond ne passe plus la
 * validation, donc le serveur la rejette et le client la relit vide au
 * démarrage suivant, ce qui revient à un accueil effacé sans un mot. Le
 * plafond des dossiers n'est atteignable par aucun geste (il y a moins de
 * fonctionnalités que ça, et aucune ne peut être rangée deux fois), celui des
 * tuiles l'est en créant des dossiers à la chaîne.
 */
export const HOME_SECTION_MAX_TILES = 60;
export const HOME_FOLDER_MAX_ITEMS = 20;

/**
 * Un dossier de la grille : plusieurs fonctionnalités derrière une seule tuile.
 *
 * Il vit dans une section au milieu des tuiles ordinaires, parce que c'en est
 * une : même carte, même place dans la grille, même glisser-déposer. Ce qui
 * change est ce qui se passe au clic (côté client, les cartes qu'il tient se
 * déploient par-dessus l'accueil).
 *
 * Il ne range que des **fonctionnalités**, là où une section range tout : une
 * carte d'appareil et un raccourci sont déjà des tuiles courtes, les empiler
 * derrière une tuile de pleine hauteur coûterait plus de place qu'il n'en
 * gagnerait. C'est la seule asymétrie qui reste après l'unification, et elle
 * est de mise en page, pas de modèle.
 *
 * Les fonctionnalités qu'il tient comptent comme **posées sur l'accueil** : le
 * sélecteur d'ajout les exclut, exactement comme celles qui ont leur propre
 * tuile. Une fonctionnalité n'est donc jamais à deux endroits à la fois, et la
 * règle « pas deux fois la même » reste une seule règle.
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
 * Une tuile de l'accueil — appareil, fonctionnalité, raccourci ou dossier.
 *
 * ## Un seul genre de section, donc un seul genre de tuile
 *
 * Les sections étaient auparavant typées (« appareils », « fonctionnalités »,
 * « raccourcis ») et ne tenaient qu'une sorte de tuile. Ça obligeait à choisir
 * le genre **avant** d'avoir quelque chose à poser, à ouvrir une popup pour
 * ajouter une section, et à trois sélecteurs d'ajout différents. Une section
 * n'est plus qu'une rangée de tuiles ; c'est la tuile qui sait ce qu'elle est.
 *
 * ## Chaque tuile garde l'écriture qu'elle avait
 *
 * Un appareil et une fonctionnalité **sont** leur identifiant (l'entité vit
 * ailleurs) ; un raccourci et un dossier portent l'objet lui-même, parce que
 * rien d'autre ne les décrit. Les deux familles d'identifiants ne peuvent pas
 * se confondre — les fonctionnalités forment un enum fermé, les appareils sont
 * des UUID — et c'est {@link homeTileKind} qui tranche, en un seul endroit.
 *
 * Conséquence utile : les dispositions écrites avant l'unification restent
 * valides telles quelles. Leurs sections portent encore un champ `kind`, qui
 * tombe à la lecture comme n'importe quelle clé inconnue, et la première
 * écriture le fait disparaître. Rien à migrer, rien à rattraper au chargement.
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
 * Le genre d'une tuile.
 *
 * **Le seul endroit qui connaisse la forme de l'union** : tout le reste passe
 * par lui ou par les gardes ci-dessous, donc changer la représentation ne se
 * paye qu'ici.
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
 * Une section : une rangée ordonnée de tuiles, de n'importe quels genres.
 *
 * Elle ne se distingue plus par ce qu'elle tient — un appareil, une
 * fonctionnalité et un raccourci cohabitent dans la même — mais par son seul
 * `id`. Une ligne peut donc mêler une carte de pleine hauteur et des cartes
 * courtes : c'est assumé, la grille aligne les hauts et laisse les cartes
 * courtes à leur taille.
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
    imageUrl: z.string().url().nullable(),
    stats: z.array(z.object({ label: z.string(), value: z.string() })).max(4),
    /**
     * Optional live/online status, rendered as a small green/red dot in the tile
     * corner (e.g. Twitch live vs offline). Omitted when not applicable.
     */
    status: z.enum(['online', 'offline']).optional()
});
export type ShortcutPreview = z.infer<typeof shortcutPreviewSchema>;
