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
