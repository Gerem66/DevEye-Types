import { z } from 'zod';

/**
 * Les jetons d'accès d'un espace, tous fournisseurs confondus.
 *
 * **Ils appartiennent à l'espace**, pas à ce qui s'en sert : un jeton GitHub
 * ouvre en général plusieurs dépôts, une clé Dokploy plusieurs applications, et
 * les ressaisir par objet serait à la fois pénible et plus risqué.
 *
 * Une seule table, deux propriétaires. La forme d'un jeton ne dépend pas du
 * fournisseur (une étiquette, une adresse d'instance quand le service est
 * auto-hébergé, un secret), mais **le droit d'y toucher, si** : les jetons
 * GitHub relèvent de la feature Git, les clés Dokploy de la feature
 * Déploiement. Chacune n'expose que les siens, et c'est ce qui a fait sortir la
 * clé Dokploy de l'écran des dépôts, où elle n'avait jamais eu de raison d'être
 * — elle y avait atterri faute d'un module de déploiement pour l'accueillir.
 *
 * Le secret ne sort **jamais** : seule sa présence est annoncée (`hasSecret`).
 * Même parti pris que la clé d'API météo — un secret qu'on ne renvoie pas est un
 * secret qui ne peut fuiter ni par une capture d'écran ni par un journal.
 *
 * Toujours chiffré à l'**étage ouvert** : les deux services de fond qui s'en
 * servent tournent sans session.
 */

export const CREDENTIAL_LABEL_MAX_LENGTH = 64;
export const CREDENTIAL_SECRET_MAX_LENGTH = 512;

/** Les services extérieurs que DevEye sait joindre au nom de l'espace. */
export const credentialProviderSchema = z.enum(['github', 'dokploy']);
export type CredentialProvider = z.infer<typeof credentialProviderSchema>;

export const credentialSchema = z.object({
    id: z.number().int().positive(),
    provider: credentialProviderSchema,
    label: z.string().max(CREDENTIAL_LABEL_MAX_LENGTH),
    /** Racine de l'instance auto-hébergée ; `null` pour une API publique. */
    baseUrl: z.string().nullable(),
    hasSecret: z.boolean(),
    created: z.number().int(),
    /** Combien d'objets s'en servent — dépôts pour GitHub, cibles pour Dokploy. */
    useCount: z.number().int().nonnegative()
});
export type Credential = z.infer<typeof credentialSchema>;

/** Ligne SQL (serveur uniquement). */
export interface CredentialRow {
    id: number;
    workspace_id: number;
    provider: string;
    label: string;
    base_url: string | null;
    secret_enc: string;
    created: number;
}
