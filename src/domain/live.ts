import { z } from 'zod';
import { userColorSchema } from './user';
import { workspaceFeatureIdSchema, type WorkspaceFeatureId } from './workspaceRole';

/**
 * La présence en direct : qui est dans l'espace, où, et ce qui vient d'y changer.
 *
 * Le mot « presence » est déjà pris dans ce dépôt par la présence des *agents*
 * (`domain/presence.ts`, `DEVICE_PRESENCE_EVENT`) : ici le vocabulaire de code
 * est **live**, et « Présence » n'est que le mot de l'interface.
 */

/**
 * Un segment de localisation, sous la forme `kind:value`.
 *
 * Le `kind` identifie le **niveau** (`view`, `account`, `folder`…), la valeur
 * identifie le nœud à ce niveau. La valeur peut elle-même contenir des
 * deux-points — une vue d'appareil est `view:device:<uuid>` — donc **on découpe
 * au premier deux-points, jamais avec un `split` complet.**
 */
export const livePathSegmentSchema = z
    .string()
    .min(3)
    .max(96)
    .regex(/^[a-z][a-z0-9]*:[A-Za-z0-9_:.-]{1,80}$/, 'Segment attendu sous la forme kind:value');

/**
 * Le chemin complet, de la racine vers la feuille. `[]` = l'accueil.
 *
 * Plafonné à six niveaux : c'est deux de plus que la feature la plus profonde
 * (Mail : vue → compte → dossier → message), et ça borne le coût de la
 * projection par destinataire quoi qu'envoie un client.
 */
export const livePathSchema = z.array(livePathSegmentSchema).max(6);
export type LivePath = z.infer<typeof livePathSchema>;

/** Le `kind` d'un segment, sans sa valeur. */
export function segmentKind(segment: string): string {
    const i = segment.indexOf(':');
    return i === -1 ? segment : segment.slice(0, i);
}

/** La valeur d'un segment, deux-points internes compris. */
export function segmentValue(segment: string): string {
    const i = segment.indexOf(':');
    return i === -1 ? '' : segment.slice(i + 1);
}

/**
 * Position du curseur dans la **surface** de la vue (le corps de la popup, ou la
 * grille de l'accueil quand rien n'est ouvert).
 *
 * Unités volontairement mixtes, parce que les deux axes n'ont pas le même sens :
 *
 *  - `x` est **relatif** (0..1) à la largeur de la surface. La popup est bornée
 *    à 1240 px : au-delà les deux fenêtres ont la même boîte, en dessous elles
 *    divergent, et seule une fraction reste juste.
 *  - `y` est en **pixels absolus du contenu**, défilement compris. Le contenu
 *    est le même des deux côtés (même liste, mêmes lignes) : « le pair est sur
 *    le 14ᵉ message » est le sens qu'on veut, alors qu'une fraction de la
 *    hauteur totale se décalerait dès qu'une liste est chargée plus loin d'un
 *    côté que de l'autre.
 */
export const liveCursorSchema = z.object({
    x: z.number().min(-1).max(2),
    y: z.number().min(-100_000).max(100_000)
});
export type LiveCursor = z.infer<typeof liveCursorSchema>;

/**
 * Un pair tel qu'il est diffusé.
 *
 * Ni pseudo ni avatar : `users.avatar` est une URL de données pouvant atteindre
 * 1,5 Mo (`AVATAR_MAX_LENGTH`), et le roster repart à chaque changement de
 * chemin. Le client résout les deux par `userId` contre les membres de l'espace,
 * que la session lui a déjà donnés. Seule la **couleur** voyage, parce qu'elle
 * doit changer à l'instant où son propriétaire la change.
 */
export const livePeerSchema = z.object({
    /** Identité de la *connexion*, pas du compte : deux onglets = deux pairs. */
    connId: z.string().min(1),
    userId: z.number().int().positive(),
    color: userColorSchema,
    workspaceId: z.number().int().positive(),
    /** Tronqué à `[]` si le destinataire n'a pas le droit de voir ce lieu. */
    path: livePathSchema,
    cursor: liveCursorSchema.nullable()
});
export type LivePeer = z.infer<typeof livePeerSchema>;

/**
 * Ce qui vient de changer dans un espace, à la maille de la feature.
 *
 * Volontairement grossier : le client ne tient aucun cache normalisé, il
 * re-sollicite. Un sujet plus fin ne ferait qu'ajouter de la synchronisation
 * sans rien économiser.
 */
export const liveTopicSchema = z.enum([
    ...workspaceFeatureIdSchema.options,
    /** Membres, rôles, nom, logo de l'espace. */
    'workspace',
    /** Disposition de l'accueil. */
    'home',
    /** Réglages de compte (avatar, couleur, thème, chiffrement). */
    'account'
]);
export type LiveTopic = z.infer<typeof liveTopicSchema>;

/**
 * La feature dont un sujet relève, ou `null` quand il n'en relève d'aucune.
 *
 * `null` **n'est pas** « visible par personne » mais « aucun droit de feature à
 * vérifier » : l'appartenance à l'espace suffit. Les trois qui y tombent le
 * méritent — la liste des membres est visible de tous les membres, la
 * disposition de l'accueil est commune, et `account` n'est jamais diffusé que
 * dans un espace personnel, c'est-à-dire à ses propres autres onglets.
 */
export const TOPIC_FEATURE: Record<LiveTopic, WorkspaceFeatureId | null> = {
    devices: 'devices',
    monitoring: 'monitoring',
    weather: 'weather',
    password: 'password',
    notes: 'notes',
    cloudsync: 'cloudsync',
    uptime: 'uptime',
    mail: 'mail',
    workspace: null,
    home: null,
    account: null
};

/**
 * Le droit qu'exige la **racine** d'un chemin, pour décider si un pair est
 * montré là où il est ou renvoyé à « ailleurs ».
 *
 * Trois issues :
 *  - une feature → montré au destinataire qui a `read` dessus ;
 *  - `'public'`  → montré à tout membre (aujourd'hui : personne, gardé pour un
 *    éventuel lieu commun) ;
 *  - `'private'` → **jamais montré**, à personne.
 *
 * Les vues de compte et d'administration (Profil, Sécurité, Journaux,
 * Utilisateurs, Gestion de l'espace) tombent dans `'private'`. `featureBehind`
 * côté client leur rend `null` parce qu'elles ont leurs propres gardes ; ici
 * `null` voudrait dire « visible par tous », ce qui ferait fuiter « Gerem est
 * dans Sécurité ». D'où le troisième cas, plutôt qu'une réutilisation directe.
 */
export type LivePathGate = WorkspaceFeatureId | 'public' | 'private';

const DEVICE_VIEW_PREFIX = 'device:';

export function livePathGate(rootSegment: string | undefined): LivePathGate {
    if (!rootSegment) return 'public';
    if (segmentKind(rootSegment) !== 'view') return 'private';
    const viewId = segmentValue(rootSegment);
    const asFeature = workspaceFeatureIdSchema.safeParse(viewId);
    if (asFeature.success) return asFeature.data;
    // La page Appareils et chaque vue d'appareil relèvent du même droit — miroir
    // exact de `featureBehind` côté client.
    if (viewId === 'clients' || viewId.startsWith(DEVICE_VIEW_PREFIX)) return 'devices';
    return 'private';
}
