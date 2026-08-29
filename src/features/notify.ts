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
 * Les canaux d'alerte de l'espace, et les routes qui pointent vers eux. Un
 * module à part : la fonctionnalité est un argument, pas un préfixe de
 * commande, et un émetteur de plus ne coûte qu'une valeur dans
 * `notificationFeatureSchema`.
 *
 * Deux étages d'autorisation : gérer les canaux d'une fonctionnalité relève du
 * champ `channels` de son grant ; les routes relèvent de la fonctionnalité
 * visée (`{ feature, level: 'write' }`). On peut confier le routage sans
 * confier l'adresse de l'astreinte.
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
 * Ce qu'une suppression emporterait, sans rien supprimer : lue par la
 * confirmation pour nommer les routes qui vont cesser de prévenir.
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

/** Un envoi d'essai sur un seul canal, tel qu'il est enregistré. */
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
         * Les canaux de la route qui n'appartiennent pas à cet espace (élément
         * projeté depuis ailleurs). Rendus masqués : leur genre, jamais leur
         * identité ni leur adresse.
         */
        foreign: z.array(notificationChannelSchema),
        /**
         * Cette route se règle-t-elle d'ici ? Faux sur un élément projeté
         * depuis un autre espace : ses canaux appartiennent à cet espace-là.
         */
        managedHere: z.boolean(),
        /**
         * L'espace où cette route se règle : le domicile de l'élément (égal à
         * l'espace de l'enveloppe quand `managedHere` est vrai).
         */
        homeWorkspaceId: z.number().int().positive()
    })
};

export const notifyRouteSet = {
    command: 'notify.routeSet' as const,
    input: notificationRouteInputSchema,
    output: z.object({ route: notificationRouteSchema })
};

/** Un essai sur la route entière : ce que verrait une vraie alerte. */
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
