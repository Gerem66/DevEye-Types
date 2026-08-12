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
 */

/**
 * Les features qui savent notifier. Une entrée ici, pas une table de plus :
 * ajouter un émetteur ne doit rien coûter au schéma.
 */
export const notificationFeatureSchema = z.enum(['uptime', 'sentinel']);
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
