import { z } from 'zod';

import { NOTIFYING_FEATURES } from './featureRegistry';
import { externalFeatureIdSchema } from './workspaceRole';

/**
 * Les canaux d'alerte d'un espace : une liste, et des liaisons vers elle.
 *
 * Un canal est une destination nommée (type, libellé, cible) qui appartient à
 * une fonctionnalité : c'est une source de cette fonctionnalité, gérée dans
 * ses réglages. Deux features qui préviennent le même salon le déclarent deux
 * fois, et chacune se corrige à un seul endroit.
 *
 * Une route dit qui écrit vers quels canaux ; la sélection vit sur l'élément.
 * Une route de fonctionnalité (`itemId` absent) ne subsiste que pour les
 * émetteurs sans éléments (Sentinelle). Tout est éteint par défaut : sans
 * canal ni route, rien ne part.
 */

/**
 * Le type d'un canal, et ce qu'il change à l'envoi. `webhook` et `discord`
 * sont une déclaration, jamais devinés d'après l'URL.
 *  - `email`   : un compte Mail « open » de l'espace expédie vers une adresse.
 *  - `webhook` : un POST JSON générique, le message lisible répété dans
 *    `content` (Discord) et `text` (Slack), les champs structurés à côté.
 *  - `discord` : embeds, couleurs, champs, et le suivi vivant d'un déploiement
 *    (un seul message mis à jour du début à la fin).
 */
export const notificationChannelKindSchema = z.enum(['email', 'webhook', 'discord']);
export type NotificationChannelKind = z.infer<typeof notificationChannelKindSchema>;

export const NOTIFICATION_CHANNEL_KINDS = notificationChannelKindSchema.options;

/**
 * Les fonctionnalités natives qui savent prévenir. Enum fermé : c'est lui qui
 * garde une route d'être posée sur une fonctionnalité qui n'écrira jamais. Il
 * double `notifies` du registre ; le contrôle en bas de fichier les tient égaux.
 */
export const nativeNotificationFeatureSchema = z.enum([
    'uptime',
    'sentinel',
    'database',
    'deploy',
    'backup',
    'convert',
    'invoicing',
    'finance'
]);
export type NativeNotificationFeature = z.infer<typeof nativeNotificationFeatureSchema>;

/**
 * The instance's own alerts (server errors, crashes, restarts). Not a workspace
 * feature: only a global admin who owns the workspace may declare its channels
 * and route, and the server delivers to every such workspace.
 */
export const SYSTEM_NOTIFICATION_TARGET = 'system';
export const systemNotificationTargetSchema = z.literal(SYSTEM_NOTIFICATION_TARGET);
export type SystemNotificationTarget = z.infer<typeof systemNotificationTargetSchema>;

/** What the settings screen shows for the system target, in place of a feature descriptor. */
export const SYSTEM_NOTIFICATION_INFO = {
    label: 'Système',
    hint: 'Les erreurs du serveur, ses plantages et ses redémarrages. Réservé aux administrateurs.'
} as const;

/**
 * Un module externe peut prévenir aussi. Le schéma n'atteste que la **forme**
 * de l'id : la garde de fond (« ce module déclare bien `notifies` ») ne peut
 * pas vivre ici, elle dépend de l'installation ; le serveur la tient contre le
 * registre fusionné, au même endroit que `assertChannels`.
 */
export const notificationFeatureSchema = z.union([
    nativeNotificationFeatureSchema,
    systemNotificationTargetSchema,
    externalFeatureIdSchema
]);
export type NotificationFeature = z.infer<typeof notificationFeatureSchema>;

export const NOTIFICATION_LABEL_MAX = 64;
export const NOTIFICATION_TARGET_MAX = 2048;
export const NOTIFICATION_EMAIL_MAX = 320;

/**
 * Un canal tel que le client le reçoit. `target` sort en clair : c'est une
 * adresse que son auteur a saisie et doit pouvoir relire. Chiffrée au repos
 * (étage ouvert).
 */
export const notificationChannelSchema = z.object({
    id: z.number().int().positive(),
    kind: notificationChannelKindSchema,
    /** Nom donné par l'utilisateur — « Astreinte », « #ops », « Webhook Grafana ». */
    label: z.string().min(1).max(NOTIFICATION_LABEL_MAX),
    /**
     * Adresse destinataire (`email`) ou URL appelée en POST (`webhook`,
     * `discord`). Vide pour qui n'a pas la gestion des canaux de la
     * fonctionnalité (`channels` du grant) : la liste est lisible avec la
     * fonctionnalité, pour router, mais confier le réglage d'Uptime ne confie
     * pas l'adresse de l'astreinte.
     */
    target: z.string().max(NOTIFICATION_TARGET_MAX),
    /** Le compte Mail expéditeur ; `null` hors des canaux `email`. */
    mailAccountId: z.number().int().positive().nullable(),
    /**
     * Ce canal partirait-il maintenant ? Faux quand le compte expéditeur
     * manque, a disparu, est désactivé ou n'est pas au palier « open ».
     */
    ready: z.boolean(),
    /** Éteint sans être supprimé : ses routes restent, rien ne part. */
    enabled: z.boolean(),
    position: z.number().int().nonnegative(),
    /**
     * Combien de routes le désignent (« utilisé par N »). Compté côté serveur :
     * le client n'a pas les routes des éléments sous la main.
     */
    usageCount: z.number().int().nonnegative()
});
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

/** Ce qu'accepte `notify.channelAdd` / `channelUpdate`. */
export const notificationChannelInputSchema = z.object({
    kind: notificationChannelKindSchema,
    label: z.string().min(1).max(NOTIFICATION_LABEL_MAX),
    /** Adresse ou URL. Vide sur un `email` = l'adresse du compte expéditeur. */
    target: z.string().max(NOTIFICATION_TARGET_MAX),
    mailAccountId: z.number().int().positive().nullable()
});
export type NotificationChannelInput = z.infer<typeof notificationChannelInputSchema>;

/**
 * La cible d'une route : une fonctionnalité, ou un de ses éléments.
 *
 * `itemId` absent vaut « la fonctionnalité elle-même ». En base il devient `0`,
 * parce qu'une colonne d'une clé primaire ne peut pas être nulle ; le contrat,
 * lui, n'a pas à porter cette contrainte de stockage.
 */
export const notificationRouteTargetSchema = z.object({
    feature: notificationFeatureSchema,
    itemId: z.number().int().positive().optional()
});
export type NotificationRouteTarget = z.infer<typeof notificationRouteTargetSchema>;

/** Où écrit une cible : sa sélection de canaux. Vide, elle ne prévient personne. */
export const notificationRouteSchema = z.object({
    channelIds: z.array(z.number().int().positive())
});
export type NotificationRoute = z.infer<typeof notificationRouteSchema>;

/** Ce qu'accepte `notify.routeSet`. Une sélection vide efface la route. */
export const notificationRouteInputSchema = notificationRouteTargetSchema.extend({
    channelIds: z.array(z.number().int().positive()).max(32)
});
export type NotificationRouteInput = z.infer<typeof notificationRouteInputSchema>;

/**
 * Ce que rend un envoi d'essai : parti, ou pourquoi non. `sent: false` avec un
 * `error` n'est pas une exception : « aucun canal activé » est une réponse.
 */
export const notificationTestSchema = z.object({ sent: z.boolean(), error: z.string().nullable() });
export type NotificationTest = z.infer<typeof notificationTestSchema>;

/**
 * Ce qu'une suppression de canal emporte, rendu avant la suppression pour que
 * la confirmation nomme ce qui va cesser de prévenir. Liste vide = aucune route.
 */
export const notificationChannelUsageSchema = z.object({
    channelId: z.number().int().positive(),
    routes: z.array(
        z.object({
            feature: notificationFeatureSchema,
            itemId: z.number().int().positive().nullable(),
            /** Nom de l'élément, déchiffré par le serveur ; `null` sur une route de feature. */
            itemLabel: z.string().nullable()
        })
    )
});
export type NotificationChannelUsage = z.infer<typeof notificationChannelUsageSchema>;

/** Ligne de `notification_channels` (serveur uniquement). */
export interface NotificationChannelRow {
    id: number;
    workspace_id: number;
    /** La fonctionnalité propriétaire : un canal est une source de sa feature. */
    feature: NotificationFeature;
    kind: NotificationChannelKind;
    label_enc: string;
    target_enc: string;
    mail_account_id: number | null;
    enabled: number;
    position: number;
    created: number;
}

/** Ligne de `notification_routes` (serveur uniquement). */
export interface NotificationRouteRow {
    id: number;
    workspace_id: number;
    feature: NotificationFeature;
    /** `0` = la fonctionnalité elle-même. */
    item_id: number;
}

/**
 * Contrôle de cohérence au chargement : une fonctionnalité marquée `notifies`
 * mais absente de l'enum afficherait un onglet Notifications dont toutes les
 * commandes seraient refusées.
 */
{
    const registry = [...NOTIFYING_FEATURES].sort().join(', ');
    const declared = [...nativeNotificationFeatureSchema.options].sort().join(', ');
    if (registry !== declared) {
        throw new Error(
            `nativeNotificationFeatureSchema et FEATURE_REGISTRY.notifies divergent : ` +
                `registre : [${registry}], enum : [${declared}]`
        );
    }
}
