import { z } from 'zod';

/**
 * Les canaux d'alerte d'un espace — **par feature**.
 *
 * Le mécanisme est commun (un compte mail « open » comme expéditeur, un
 * webhook), la configuration ne l'est pas : Uptime prévient quand un service
 * tombe, Sentinelle quand une machine est suspecte, et ce ne sont ni les mêmes
 * destinataires, ni la même urgence, ni forcément le même salon Discord.
 *
 * Sentinelle a d'abord emprunté les canaux d'Uptime « pour éviter deux jeux de
 * réglages ». C'était une erreur de fond : on recevait des alertes de sécurité
 * sur un canal qu'on n'avait jamais désigné pour ça, sans que rien ne l'ait
 * annoncé ni ne permette de l'éteindre.
 *
 * Bases de données faisait **exactement la même chose**, et l'a fait plus
 * longtemps : `DatabaseMonitor` appelait `UptimeMonitor.resolveChannels`, si
 * bien qu'un seuil SQL franchi partait sur le salon de la disponibilité. Ce
 * n'était pas un oubli mais un choix documenté — il n'en était pas moins le
 * même travers, et la ligne `database` le referme. Déploiement arrive avec ses
 * propres canaux dès le premier jour, ce qui n'aurait pas dû mériter d'être
 * signalé.
 */

/**
 * Les features qui savent notifier. Une entrée ici, pas une table de plus :
 * ajouter un émetteur ne doit rien coûter au schéma.
 */
export const notificationFeatureSchema = z.enum([
    'uptime',
    'sentinel',
    'database',
    'deploy',
    'backup'
]);
export type NotificationFeature = z.infer<typeof notificationFeatureSchema>;

export const notificationSettingsSchema = z.object({
    emailEnabled: z.boolean(),
    /** Destinataire, ou `null` pour l'adresse du compte expéditeur lui-même. */
    email: z.string().nullable(),
    /** Le compte Mail qui envoie ; `null` = aucun choisi, donc aucun envoi. */
    mailAccountId: z.number().int().positive().nullable(),
    /**
     * Faux quand `mailAccountId` est absent, pointe sur un compte disparu ou
     * non « open ». L'interface le dit au lieu de laisser croire à un canal actif.
     */
    mailAccountReady: z.boolean(),
    webhookEnabled: z.boolean(),
    /** Reçoit un POST JSON à chaque alerte ; `null` quand non réglé. */
    webhookUrl: z.string().nullable()
});
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

/**
 * Ce qu'une commande `*.setSettings` accepte — **un seul schéma pour les quatre
 * émetteurs**.
 *
 * Il était recopié à l'identique dans `features/uptime.ts` et
 * `features/sentinel.ts`, et l'aurait été deux fois de plus en branchant Bases
 * de données et Déploiement. Quatre copies d'un même objet de cinq champs, c'est
 * la garantie qu'un futur canal n'arrivera que dans trois d'entre elles. La
 * différence entre les émetteurs tient dans le nom de la commande, pas dans ce
 * qu'elle prend.
 */
export const notificationSettingsInputSchema = z.object({
    emailEnabled: z.boolean(),
    /** Vide = l'adresse du compte expéditeur lui-même. */
    email: z.string().max(320),
    mailAccountId: z.number().int().positive().nullable(),
    webhookEnabled: z.boolean(),
    webhookUrl: z.string().max(2048)
});
export type NotificationSettingsInput = z.infer<typeof notificationSettingsInputSchema>;

/**
 * Ce que rend un `*.testNotification` : parti, ou pourquoi non.
 *
 * `sent: false` avec un `error` n'est pas une exception — « aucun canal activé »
 * est une réponse, pas une panne, et la remonter comme telle laisserait le
 * dialogue afficher « échec » là où il n'y a rien à échouer.
 */
export const notificationTestSchema = z.object({ sent: z.boolean(), error: z.string().nullable() });
export type NotificationTest = z.infer<typeof notificationTestSchema>;

/** Ligne de `notification_settings` (serveur uniquement). */
export interface NotificationSettingsRow {
    workspace_id: number;
    feature: NotificationFeature;
    email_enabled: number;
    email_enc: string | null;
    mail_account_id: number | null;
    webhook_enabled: number;
    webhook_enc: string | null;
}
