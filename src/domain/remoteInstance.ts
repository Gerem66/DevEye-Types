import { z } from 'zod';

/**
 * Une instance distante : un AUTRE serveur DevEye dont le compte range les
 * espaces à côté des siens. Le serveur d'accueil n'en retient que l'adresse et
 * un libellé, et ne la contacte jamais : c'est le navigateur qui y ouvre sa
 * propre session, avec les identifiants de là-bas, qu'aucun serveur ne garde.
 */

/** Instances distantes par compte. Chacune élargit la politique de contenu de sa page. */
export const REMOTE_INSTANCES_MAX = 5;

export const REMOTE_LABEL_MAX = 60;

/** Nom d'hôte ou IPv4. Une IPv6 littérale n'a pas de forme dans une source CSP. */
const HOST_PATTERN = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;

/**
 * Ramène une adresse saisie à son origine (`https://hôte[:port]`), ou `null`.
 * Stricte parce que l'origine finit dans un en-tête `Content-Security-Policy` :
 * ni chemin, ni identifiants, ni joker, rien qui puisse y injecter une directive.
 */
export function normalizeRemoteOrigin(input: string): string | null {
    let url: URL;
    try {
        url = new URL(input.trim());
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== '/' && url.pathname !== '') return null;
    if (!HOST_PATTERN.test(url.hostname)) return null;
    return url.origin;
}

export const remoteOriginSchema = z
    .string()
    .min(1)
    .max(255)
    .transform((value, ctx) => {
        const origin = normalizeRemoteOrigin(value);
        if (origin === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Adresse attendue sous la forme https://hôte ou https://hôte:port'
            });
            return z.NEVER;
        }
        return origin;
    });

export const remoteInstanceSchema = z.object({
    id: z.number().int().positive(),
    label: z.string().min(1).max(REMOTE_LABEL_MAX),
    origin: z.string().min(1).max(255),
    created: z.number().int().nonnegative()
});

export type RemoteInstance = z.infer<typeof remoteInstanceSchema>;

/** Ligne SQL (serveur uniquement). */
export interface RemoteInstanceRow {
    id: number;
    user_id: number;
    label: string;
    origin: string;
    sort_order: number;
    created: number;
}
