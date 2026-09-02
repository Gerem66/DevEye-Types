import { z } from 'zod';
import { liveCursorSchema, livePathSchema, livePeerSchema, liveTopicSchema } from '../domain/live';

/**
 * Déclare où je suis, et récupère l'état de la salle. L'espace n'est pas dans
 * l'entrée : il voyage sur l'enveloppe, résolu et vérifié par le dispatcheur.
 * La réponse porte l'instantané de la salle : aucun trou entre l'inscription
 * et la première diffusion, et une reconnexion se resynchronise par ce seul
 * appel.
 */
export const liveHere = {
    command: 'live.here' as const,
    input: z.object({ path: livePathSchema }),
    output: z.object({ peers: z.array(livePeerSchema) })
};

export const liveCommands = [liveHere] as const;

/**
 * Les positions de curseur, hors du registre des commandes : `ws.send` y
 * ouvrirait une promesse et armerait un délai pour une trame émise vingt fois
 * par seconde sans réponse. Le client la poste par `ws.post`, le serveur la
 * traite sur une voie rapide.
 */
export const LIVE_CURSOR_COMMAND = 'live.cursor' as const;

/**
 * Ce que porte une trame de curseur : des coordonnées, rien d'autre. Ni chemin
 * ni espace : la voie rapide court-circuite l'autorisation, le lieu vient du
 * dernier `live.here`. `cursor: null` = le pointeur a quitté la surface.
 */
export const liveCursorFrameSchema = z.object({ cursor: liveCursorSchema.nullable() });
export type LiveCursorFrame = z.infer<typeof liveCursorFrameSchema>;

/**
 * « Untel est en train d'écrire… », sur la même voie rapide que les curseurs et
 * hors du registre pour la même raison. Générique : la trame ne dit pas quoi,
 * le lieu vient du dernier `live.here`. Le serveur applique une péremption :
 * sans rafraîchissement, un pair cesse d'écrire tout seul (pas de fantôme
 * après un onglet fermé brutalement).
 */
export const LIVE_TYPING_COMMAND = 'live.typing' as const;
export const liveTypingFrameSchema = z.object({ typing: z.boolean() });
export type LiveTypingFrame = z.infer<typeof liveTypingFrameSchema>;

/** Qui écrit, parmi les pairs situés au **même chemin exactement**. */
export const LIVE_TYPERS_EVENT = 'live.typers' as const;
export const liveTypersPushSchema = z.object({
    workspaceId: z.number().int().positive(),
    typers: z.array(
        z.object({
            connId: z.string().min(1),
            userId: z.number().int().positive()
        })
    )
});
export type LiveTypersPush = z.infer<typeof liveTypersPushSchema>;

/**
 * La bulle : le texte libre qu'un pair écrit à son curseur, à la Figma. Même
 * voie rapide et même projection que les curseurs, mais un canal distinct du
 * leur, parce que `liveCursorSchema` voyage aussi dans le roster, lequel part à
 * tout l'espace alors que seul son `path` est tronqué par droits.
 *
 * `message: null` = plus de bulle. Le client n'émet jamais la chaîne vide.
 */
export const LIVE_SAY_COMMAND = 'live.say' as const;

/**
 * La voie rapide court-circuite le scope, l'audit et l'autorisation : cette
 * borne est le seul rempart contre une trame abusive.
 */
export const SAY_MAX_LENGTH = 140;

/**
 * Et son plafond en lignes. La longueur seule ne borne pas la hauteur : cent
 * retours à la ligne tiennent dans cent caractères, et la boîte descendrait
 * sous le bas de l'écran. La saisie applique le même plafond.
 */
export const SAY_MAX_LINES = 10;

const sayTextSchema = z
    .string()
    .max(SAY_MAX_LENGTH)
    .refine((text) => text.split('\n').length <= SAY_MAX_LINES, {
        message: `Au plus ${SAY_MAX_LINES} lignes`
    });

export const liveSayFrameSchema = z.object({ message: sayTextSchema.nullable() });
export type LiveSayFrame = z.infer<typeof liveSayFrameSchema>;

/** Ce que disent les pairs situés au **même chemin exactement**. */
export const LIVE_SAYS_EVENT = 'live.says' as const;
export const liveSaysPushSchema = z.object({
    workspaceId: z.number().int().positive(),
    says: z.array(
        z.object({
            connId: z.string().min(1),
            userId: z.number().int().positive(),
            text: sayTextSchema
        })
    )
});
export type LiveSaysPush = z.infer<typeof liveSaysPushSchema>;

/** Roster de la salle. Projeté par destinataire : les chemins y sont tronqués. */
export const LIVE_PEERS_EVENT = 'live.peers' as const;
export const livePeersPushSchema = z.object({
    workspaceId: z.number().int().positive(),
    peers: z.array(livePeerSchema)
});
export type LivePeersPush = z.infer<typeof livePeersPushSchema>;

/** Curseurs des pairs situés au **même chemin exactement** que le destinataire. */
export const LIVE_CURSORS_EVENT = 'live.cursors' as const;
export const liveCursorsPushSchema = z.object({
    workspaceId: z.number().int().positive(),
    cursors: z.array(
        z.object({
            connId: z.string().min(1),
            userId: z.number().int().positive(),
            cursor: liveCursorSchema
        })
    )
});
export type LiveCursorsPush = z.infer<typeof liveCursorsPushSchema>;

/**
 * Quelque chose a changé dans l'espace : les vues qui en dépendent
 * re-sollicitent. Émis par le dispatcheur après toute commande déclarant
 * `mutates`, et par les tâches de fond qui écrivent sans commande.
 */
export const LIVE_CHANGED_EVENT = 'live.changed' as const;
export const liveChangedPushSchema = z.object({
    workspaceId: z.number().int().positive(),
    topics: z.array(liveTopicSchema).min(1),
    /** L'auteur, ou `null` pour une tâche de fond. Jamais renvoyé à lui-même. */
    by: z.number().int().positive().nullable()
});
export type LiveChangedPush = z.infer<typeof liveChangedPushSchema>;
