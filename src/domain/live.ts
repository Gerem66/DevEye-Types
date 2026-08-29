import { z } from 'zod';
import { userColorSchema } from './user';
import {
    externalFeatureIdSchema,
    isExternalFeatureId,
    workspaceFeatureIdSchema,
    type FeatureId,
    type WorkspaceFeatureId
} from './workspaceRole';

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
 * L'état du curseur, tel que le navigateur le dessine à celui qui le tient.
 * Transmis avec la position parce qu'il porte l'intention (cliquer, lire,
 * déplacer). Sept familles seulement : la plupart des curseurs CSS ne se
 * distinguent pas à seize pixels.
 */
export const liveCursorKindSchema = z.enum([
    'default',
    /** `pointer` — quelque chose de cliquable est sous le curseur. */
    'pointer',
    /** `text` — du texte lisible ou sélectionnable. */
    'text',
    /** `grab` — saisissable, mais pas encore saisi. */
    'grab',
    /** `grabbing` / `move` — quelque chose est en train d'être déplacé. */
    'grabbing',
    /** Les `*-resize` — une poignée de redimensionnement. */
    'resize',
    /** `not-allowed` / `no-drop` — l'action est refusée ici. */
    'blocked'
]);
export type LiveCursorKind = z.infer<typeof liveCursorKindSchema>;

/**
 * Position du curseur dans la surface de la vue. Unités mixtes à dessein :
 *  - `x` est relatif (0..1) à la largeur de la surface, bornée à 1240 px : seule
 *    une fraction reste juste quand les deux fenêtres divergent ;
 *  - `y` est en pixels absolus du contenu, défilement compris : le contenu est
 *    le même des deux côtés, alors qu'une fraction de la hauteur se décalerait
 *    dès qu'une liste est chargée plus loin d'un côté.
 * Les bornes de `x` dépassent [0, 1] : le pointeur vit aussi dans les marges,
 * et l'écrêter ferait disparaître le curseur d'un pair sur la même page.
 */
export const liveCursorSchema = z.object({
    x: z.number().min(-10).max(10),
    y: z.number().min(-100_000).max(100_000),
    kind: liveCursorKindSchema
});
export type LiveCursor = z.infer<typeof liveCursorSchema>;

/**
 * Un pair tel qu'il est diffusé. Ni pseudo ni avatar : `users.avatar` est une
 * URL de données pouvant atteindre 1,5 Mo, et le roster repart à chaque
 * changement de chemin ; le client résout les deux par `userId` contre les
 * membres de l'espace. Seule la couleur voyage, parce qu'elle doit changer à
 * l'instant où son propriétaire la change.
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
export const nativeLiveTopicSchema = z.enum([
    ...workspaceFeatureIdSchema.options,
    /** Membres, rôles, nom, logo de l'espace. */
    'workspace',
    /**
     * L'accueil de l'espace : disposition et apparence. Ensemble parce qu'ils
     * se relisent ensemble (`workspace.activate` rend les deux), et sous
     * l'espace et non `account` : le thème est un réglage de l'espace.
     */
    'home',
    /** Réglages de compte (avatar, couleur, thème, chiffrement). */
    'account',
    /**
     * Les canaux d'alerte de l'espace et les routes qui pointent dessus. Un
     * sujet à part : les canaux se relisent depuis les réglages de n'importe
     * quelle fonctionnalité, et un canal change pour toutes à la fois alors que
     * `mutates` est déclaré par commande.
     */
    'notify'
]);
export type NativeLiveTopic = z.infer<typeof nativeLiveTopicSchema>;

/**
 * Un module vaut **un** sujet, qui est son id, plus les sujets secondaires que
 * son manifest déclare (`topics`, validés au boot : `projectsChat` bat les
 * messages sans faire re-solliciter le tableau). Ces sujets-là ne figurent pas
 * ici : l'app les lit dans les manifests installés. Le préfixe `x-` garantit
 * qu'un sujet externe ne percute ni une feature native ni un sujet réservé.
 */
export const liveTopicSchema = z.union([nativeLiveTopicSchema, externalFeatureIdSchema]);
export type LiveTopic = z.infer<typeof liveTopicSchema>;

/**
 * La feature dont relève un sujet, natif ou externe. Seule porte d'entrée à
 * garder : la table `TOPIC_FEATURE` ne connaît que les sujets natifs, et un
 * sujet externe **est** sa feature.
 */
export function topicFeatureOf(topic: LiveTopic): FeatureId | null {
    if (isExternalFeatureId(topic)) return topic;
    return TOPIC_FEATURE[topic as NativeLiveTopic];
}

/**
 * La feature dont un sujet relève, ou `null` quand il n'en relève d'aucune.
 *
 * `null` **n'est pas** « visible par personne » mais « aucun droit de feature à
 * vérifier » : l'appartenance à l'espace suffit. Les trois qui y tombent le
 * méritent — la liste des membres est visible de tous les membres, la
 * disposition de l'accueil est commune, et `account` n'est jamais diffusé que
 * dans un espace personnel, c'est-à-dire à ses propres autres onglets.
 */
export const TOPIC_FEATURE: Record<NativeLiveTopic, WorkspaceFeatureId | null> = {
    devices: 'devices',
    sentinel: 'sentinel',
    weather: 'weather',
    password: 'password',
    notes: 'notes',
    cloudsync: 'cloudsync',
    uptime: 'uptime',
    mail: 'mail',
    projects: 'projects',
    git: 'git',
    deploy: 'deploy',
    database: 'database',
    backup: 'backup',
    finance: 'finance',
    audience: 'audience',
    osint: 'osint',
    workspace: null,
    home: null,
    account: null,
    // Aucun droit de feature à vérifier : la relecture déclenchée est gardée
    // côté commande. Même nature que `workspace`.
    notify: null
};

/**
 * Le droit qu'exige la racine d'un chemin, pour décider si un pair est montré
 * là où il est ou renvoyé à « ailleurs » : une feature (montré à qui a `read`
 * dessus), `'public'` (tout membre), `'private'` (jamais montré). Les vues de
 * compte et d'administration tombent dans `'private'` : `null` voudrait dire
 * « visible par tous » et ferait fuiter « untel est dans Sécurité ».
 */
export type LivePathGate = FeatureId | 'public' | 'private';

const DEVICE_VIEW_PREFIX = 'device:';

export function livePathGate(rootSegment: string | undefined): LivePathGate {
    if (!rootSegment) return 'public';
    if (segmentKind(rootSegment) !== 'view') return 'private';
    const viewId = segmentValue(rootSegment);
    const asFeature = workspaceFeatureIdSchema.safeParse(viewId);
    if (asFeature.success) return asFeature.data;
    // Une vue de module externe est gardée par le droit du module, comme une
    // feature native : même règle, reconnue au préfixe plutôt qu'à l'enum.
    if (isExternalFeatureId(viewId)) return viewId;
    // La page Appareils et chaque vue d'appareil relèvent du même droit — miroir
    // exact de `featureBehind` côté client.
    if (viewId === 'clients' || viewId.startsWith(DEVICE_VIEW_PREFIX)) return 'devices';
    return 'private';
}
