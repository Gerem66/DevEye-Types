import { z } from 'zod';

import {
    notificationChannelInputSchema,
    notificationChannelSchema,
    notificationChannelUsageSchema,
    notificationFeatureSchema,
    notificationRouteInputSchema,
    notificationRouteSchema,
    notificationRouteTargetSchema,
    notificationTestSchema
} from '../domain/notifications';

/**
 * Les canaux d'alerte de l'espace, et les routes qui pointent vers eux.
 *
 * ## Pourquoi un module à part, et pas trois commandes par émetteur
 *
 * Il y en avait quinze — `getSettings`, `setSettings`, `testNotification`, pour
 * chacun des cinq émetteurs — strictement identiques à leur préfixe près. Le
 * dialogue client les reconstituait déjà par concaténation
 * (`` `${feature}.getSettings` ``), ce qui disait tout : la fonctionnalité
 * n'était pas dans la commande, elle était dans un **argument**. Elle l'est
 * désormais pour de bon.
 *
 * Conséquence directe : brancher un sixième émetteur ne coûte plus trois
 * commandes, trois entrées de registre et trois handlers, mais une valeur de
 * plus dans `notificationFeatureSchema`.
 *
 * ## Deux étages d'autorisation, et ils ne sont pas les mêmes
 *
 * Gérer les **canaux** d'une fonctionnalité relève du champ `channels` de son
 * grant de rôle (migration 093) : un canal appartient à une fonctionnalité
 * (091), et son adresse ne se livre qu'à qui gère les canaux de celle-ci. Les
 * **routes**, elles, relèvent de la fonctionnalité visée (`{ feature, level:
 * 'write' }`) : décider où Uptime écrit fait partie du réglage d'Uptime, et n'a
 * pas à ouvrir la gestion des destinations. C'est la séparation qui permet de
 * confier le routage d'une fonctionnalité sans confier l'adresse de
 * l'astreinte.
 */

const channelId = z.number().int().positive();

/** Les canaux d'une fonctionnalité, ordonnés, avec leur nombre d'usages. */
export const notifyChannelList = {
    command: 'notify.channelList' as const,
    input: z.object({ feature: notificationFeatureSchema }),
    output: z.object({ channels: z.array(notificationChannelSchema) })
};

export const notifyChannelAdd = {
    command: 'notify.channelAdd' as const,
    /** `feature` : la fonctionnalité propriétaire, immuable ensuite. */
    input: notificationChannelInputSchema.extend({ feature: notificationFeatureSchema }),
    output: z.object({ channel: notificationChannelSchema })
};

export const notifyChannelUpdate = {
    command: 'notify.channelUpdate' as const,
    input: notificationChannelInputSchema.extend({ id: channelId, enabled: z.boolean() }),
    output: z.object({ channel: notificationChannelSchema })
};

/**
 * Ce qu'une suppression emporterait, **sans rien supprimer**.
 *
 * Lue par la confirmation pour nommer les routes qui vont cesser de prévenir.
 * Séparée de la suppression elle-même parce qu'un écran qui demande « êtes-vous
 * sûr ? » sans dire de quoi ne fait pas confirmer, il fait cliquer.
 */
export const notifyChannelUsage = {
    command: 'notify.channelUsage' as const,
    input: z.object({ id: channelId }),
    output: notificationChannelUsageSchema
};

export const notifyChannelDelete = {
    command: 'notify.channelDelete' as const,
    input: z.object({ id: channelId }),
    output: z.object({ ok: z.literal(true) })
};

export const notifyChannelReorder = {
    command: 'notify.channelReorder' as const,
    input: z.object({ ids: z.array(channelId).max(64) }),
    output: z.object({ ok: z.literal(true) })
};

/**
 * Un envoi d'essai **sur un seul canal**, tel qu'il est enregistré.
 *
 * L'ancien dialogue devait enregistrer avant de tester, faute de quoi l'essai
 * partait sur les réglages précédents. Un canal étant une entité à part entière,
 * l'essai vise directement son identifiant : plus d'enregistrement forcé, et
 * plus de doute sur ce qui vient d'être éprouvé.
 */
export const notifyChannelTest = {
    command: 'notify.channelTest' as const,
    input: z.object({ id: channelId }),
    output: notificationTestSchema
};

/** Où écrit une fonctionnalité, ou un de ses éléments. */
export const notifyRouteGet = {
    command: 'notify.routeGet' as const,
    input: notificationRouteTargetSchema,
    output: z.object({
        route: notificationRouteSchema,
        /**
         * Les canaux de la route qui **n'appartiennent pas à cet espace**.
         *
         * Le cas d'un élément projeté depuis ailleurs : ses destinations vivent
         * dans son espace d'origine. Sans cette liste, l'écran afficherait
         * « aucun canal » sur un élément qui prévient bel et bien — le mensonge
         * exact que la projection devait éviter.
         *
         * Rendus **masqués** : leur genre (« Salon Discord d'un autre espace »),
         * jamais leur identité ni leur adresse.
         */
        foreign: z.array(notificationChannelSchema),
        /**
         * Cette route se règle-t-elle **d'ici** ?
         *
         * Faux sur un élément projeté depuis un autre espace : ses canaux
         * appartiennent à cet espace-là, et l'ordonnanceur qui le sonde y
         * tourne. Laisser l'écran proposer le réglage produirait un geste que
         * le serveur refuse — un écran qui ment, pas une garde.
         */
        managedHere: z.boolean()
    })
};

export const notifyRouteSet = {
    command: 'notify.routeSet' as const,
    input: notificationRouteInputSchema,
    output: z.object({ route: notificationRouteSchema })
};

/** Un essai sur la route entière, héritage compris — ce que verrait une vraie alerte. */
export const notifyRouteTest = {
    command: 'notify.routeTest' as const,
    input: notificationRouteTargetSchema,
    output: notificationTestSchema
};

export const notifyCommands = [
    notifyChannelList,
    notifyChannelAdd,
    notifyChannelUpdate,
    notifyChannelUsage,
    notifyChannelDelete,
    notifyChannelReorder,
    notifyChannelTest,
    notifyRouteGet,
    notifyRouteSet,
    notifyRouteTest
] as const;
