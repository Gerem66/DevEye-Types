import { z } from 'zod';

import { NOTIFYING_FEATURES } from './featureRegistry';
import { externalFeatureIdSchema } from './workspaceRole';

/**
 * Les canaux d'alerte d'un espace — **une liste, et des liaisons vers elle**.
 *
 * ## Ce que le modèle précédent ne savait pas faire
 *
 * Il portait deux canaux binaires — un mail, un webhook — par couple
 * `(espace, feature)`. Trois conséquences, toutes rencontrées :
 *
 * 1. **Le même salon Discord était redéclaré cinq fois.** Le corriger demandait
 *    d'ouvrir cinq écrans, et en oublier un ne se voyait qu'à la première alerte
 *    qui n'arrivait plus.
 * 2. **Deux destinataires étaient impossibles.** Une équipe pour la production,
 *    une autre pour la recette : il fallait choisir.
 * 3. **Aucun routage par élément.** Toutes les bases d'un espace prévenaient les
 *    mêmes gens, quel que soit le projet derrière.
 *
 * ## La forme retenue
 *
 * Un **canal** est une destination nommée : un type, un libellé, une cible. Il
 * appartient à **une fonctionnalité** (091) : c'est une source de cette
 * fonctionnalité, au même titre qu'un jeton Dokploy pour le Déploiement, et il
 * se gère dans ses réglages à elle. La 087 l'avait fait vivre à l'échelle de
 * l'espace, partagé par les cinq émetteurs ; on retrouvait alors une liste
 * commune gérée depuis cinq endroits, l'inverse du patron des sources. Le prix
 * assumé du retour : deux features qui préviennent le même salon le déclarent
 * deux fois. On en déclare autant qu'on veut, et on les corrige **à un seul
 * endroit** : les réglages de leur fonctionnalité.
 *
 * Une **route** dit qui écrit vers quels canaux, et la sélection vit **sur
 * l'élément** (092) : chaque cible coche un ou plusieurs canaux de sa feature
 * dans ses propres réglages, et sans sélection rien ne part. L'héritage
 * d'une « route de la fonctionnalité » a été essayé (087) puis retiré : cocher
 * un canal à l'échelle de la feature ne visait aucun élément nommable, et les
 * cases des éléments, grisées tant qu'ils « suivaient » la feature, semblaient
 * ne jamais pouvoir se cocher. Une route de fonctionnalité (`itemId` absent)
 * ne subsiste que pour les émetteurs **sans éléments** (Sentinelle), dont les
 * alertes ne visent rien de plus fin.
 *
 * Ce qui n'a pas changé, et qui compte : **tout est éteint par défaut.** Sans
 * canal ni route, rien ne part. Une fonctionnalité qui se met à écrire à des
 * gens sans qu'ils l'aient demandé reste le travers que ce modèle refuse.
 */

/**
 * Le type d'un canal, et ce qu'il change à l'envoi.
 *
 * `webhook` et `discord` **séparent ce que l'URL devinait**. Le module d'envoi
 * reconnaissait Discord en analysant l'adresse, ce qui marchait mais décidait à
 * la place de l'utilisateur : un point d'entrée maison hébergé derrière un
 * domaine Discord aurait reçu des embeds au lieu de son texte, et rien ne
 * permettait de demander l'inverse. C'est désormais une déclaration.
 *
 *  - `email`   — un compte Mail « open » de l'espace expédie vers une adresse.
 *  - `webhook` — un POST JSON générique : le message lisible est répété dans
 *    `content` (Discord) et `text` (Slack), les champs structurés suivent pour
 *    un point d'entrée maison. Aucune des trois têtes ne gêne les autres.
 *  - `discord` — la mise en page riche de Discord (embeds, couleurs, champs),
 *    et pour le déploiement le **suivi vivant** : un seul message qui se met à
 *    jour du début à la fin.
 */
export const notificationChannelKindSchema = z.enum(['email', 'webhook', 'discord']);
export type NotificationChannelKind = z.infer<typeof notificationChannelKindSchema>;

export const NOTIFICATION_CHANNEL_KINDS = notificationChannelKindSchema.options;

/**
 * Les fonctionnalités **natives** qui savent prévenir.
 *
 * Enum fermé plutôt que chaîne libre : c'est lui qui garde une route d'être
 * posée sur une fonctionnalité qui n'écrira jamais. Il double le drapeau
 * `notifies` du registre, et le contrôle en bas de fichier interdit qu'ils
 * divergent.
 */
export const nativeNotificationFeatureSchema = z.enum([
    'uptime',
    'sentinel',
    'database',
    'deploy',
    'backup'
]);
export type NativeNotificationFeature = z.infer<typeof nativeNotificationFeatureSchema>;

/**
 * Un module externe peut prévenir aussi. Le schéma n'atteste que la **forme**
 * de l'id : la garde de fond (« ce module déclare bien `notifies` ») ne peut
 * pas vivre ici, elle dépend de l'installation ; le serveur la tient contre le
 * registre fusionné, au même endroit que `assertChannels`.
 */
export const notificationFeatureSchema = z.union([
    nativeNotificationFeatureSchema,
    externalFeatureIdSchema
]);
export type NotificationFeature = z.infer<typeof notificationFeatureSchema>;

export const NOTIFICATION_LABEL_MAX = 64;
export const NOTIFICATION_TARGET_MAX = 2048;
export const NOTIFICATION_EMAIL_MAX = 320;

/**
 * Un canal tel que le client le reçoit.
 *
 * `target` sort **en clair** : c'est une adresse que son auteur a saisie et doit
 * pouvoir relire pour la corriger. Elle est chiffrée au repos (étage ouvert),
 * comme l'étaient déjà les réglages qu'elle remplace.
 */
export const notificationChannelSchema = z.object({
    id: z.number().int().positive(),
    kind: notificationChannelKindSchema,
    /** Nom donné par l'utilisateur — « Astreinte », « #ops », « Webhook Grafana ». */
    label: z.string().min(1).max(NOTIFICATION_LABEL_MAX),
    /**
     * Adresse destinataire (`email`) ou URL appelée en POST (`webhook`,
     * `discord`) : **vide pour qui n'a pas la gestion des canaux de la
     * fonctionnalité** (le champ `channels` de son grant, migration 093).
     *
     * La liste est lisible avec la fonctionnalité, parce qu'il faut voir les
     * destinations pour router vers l'une d'elles. Leur *contenu* ne l'est
     * pas : confier le réglage d'Uptime ne confie pas l'adresse de l'astreinte
     * ni l'URL du salon de production. On voit donc « Astreinte · e-mail », on
     * peut y router, et on ne peut ni la lire ni la modifier.
     */
    target: z.string().max(NOTIFICATION_TARGET_MAX),
    /** Le compte Mail expéditeur ; `null` hors des canaux `email`. */
    mailAccountId: z.number().int().positive().nullable(),
    /**
     * Ce canal partirait-il **maintenant** ?
     *
     * Faux quand le compte expéditeur manque, a disparu, est désactivé ou n'est
     * pas au palier « open ». L'interface le dit au lieu de laisser croire à un
     * canal actif — l'avertissement n'existait à l'origine que dans Uptime, et
     * son absence ailleurs faisait passer un canal muet pour un canal réglé.
     */
    ready: z.boolean(),
    /** Éteint sans être supprimé : ses routes restent, rien ne part. */
    enabled: z.boolean(),
    position: z.number().int().nonnegative(),
    /**
     * Combien de routes le désignent — ce que l'écran affiche en « utilisé par
     * N ». Compté côté serveur : le client n'a pas les routes des éléments sous
     * la main, et les demander toutes pour afficher un nombre serait une
     * requête par ligne.
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

/**
 * Où écrit une cible : sa sélection de canaux, rien de plus.
 *
 * Vide, elle ne prévient personne — il n'y a plus d'héritage à distinguer
 * (092), donc plus de drapeau `inherits` : une sélection vide et une sélection
 * jamais faite disent la même chose, le silence.
 */
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
 * Ce que rend un envoi d'essai : parti, ou pourquoi non.
 *
 * `sent: false` avec un `error` n'est pas une exception — « aucun canal activé »
 * est une réponse, pas une panne, et la remonter comme telle laisserait l'écran
 * afficher « échec » là où il n'y a rien à échouer.
 */
export const notificationTestSchema = z.object({ sent: z.boolean(), error: z.string().nullable() });
export type NotificationTest = z.infer<typeof notificationTestSchema>;

/**
 * Ce qu'une suppression de canal emporte avec elle.
 *
 * Rendu **avant** la suppression pour que la confirmation nomme ce qui va
 * cesser de prévenir, plutôt que de demander « êtes-vous sûr ? » sans dire de
 * quoi. Une liste vide veut dire qu'aucune route ne le désigne.
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
    /** La fonctionnalité propriétaire : un canal est une source de SA feature (091). */
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
 * Contrôle de cohérence, au chargement du module.
 *
 * `notifies` dans le registre et cet enum répondent à la même question ; les
 * tenir séparés est un choix (l'un décrit, l'autre valide), les laisser diverger
 * n'en est pas un. Une fonctionnalité marquée `notifies` mais absente de l'enum
 * afficherait un onglet Notifications dont toutes les commandes seraient
 * refusées — un écran qui ment, découvert à la première alerte attendue.
 *
 * Même esprit que le contrôle des sujets `mutates` côté serveur : attraper
 * l'oubli au démarrage plutôt qu'en production.
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
