import { z } from 'zod';
import {
    DATABASE_ALERT_MESSAGE_MAX_LENGTH,
    DATABASE_ALERT_NAME_MAX_LENGTH,
    DATABASE_HOST_MAX_LENGTH,
    DATABASE_NAME_MAX_LENGTH,
    DATABASE_SECRET_MAX_LENGTH,
    DATABASE_SQL_MAX_LENGTH,
    DATABASE_USER_MAX_LENGTH,
    databaseAccessKindSchema,
    databaseAlertSchema,
    databaseCombinatorSchema,
    databaseConditionSchema,
    databaseEngineSchema,
    databaseProbeSchema,
    databaseRowsSchema,
    databaseSchema,
    databaseSshAuthSchema,
    databaseTableSchema,
    databaseUsageSchema
} from '../domain/database';

/**
 * Commandes des bases de données de l'espace.
 *
 * Préfixe unique `database.`, comme `git.` et `project.` — d'où le camelCase
 * derrière le point.
 *
 * ⚠️ Conséquence à connaître : le filet de démarrage (`MUTATION_VERB` dans
 * `src/features/_topics.ts`) cherche un verbe **juste après le point**. Il ne
 * verra donc **aucune** de ces commandes, et un `mutates` oublié ne produira
 * aucun avertissement. Il se relit à la main.
 *
 * ## Rien ne se connecte tout seul
 *
 * Seules `test`, `inspect`, `tableList`, `tableRows` et `alertTest` joignent la
 * base, et toutes sont déclenchées par un geste explicite. `list` et `get`
 * lisent le cache local — ouvrir la feature ne réveille aucun serveur.
 *
 * L'espace visé n'apparaît dans aucune entrée : il voyage sur l'enveloppe WS et
 * le dispatcheur le résout, appartenance vérifiée, avant le handler.
 */

const databaseId = z.number().int().positive();
const alertId = z.number().int().positive();

/** La partie réglable d'un accès, secret compris (jamais rendu en retour). */
const accessInput = z.object({
    kind: databaseAccessKindSchema,
    host: z.string().max(DATABASE_HOST_MAX_LENGTH),
    port: z.number().int().min(1).max(65535).nullable(),
    username: z.string().max(DATABASE_USER_MAX_LENGTH),
    auth: databaseSshAuthSchema,
    /**
     * Mot de passe SSH ou clé privée. Absent = on garde celui en place ; une
     * chaîne vide l'efface. Le client ne le reçoit jamais, il ne peut donc pas
     * le renvoyer inchangé — d'où cette convention plutôt qu'un champ obligatoire.
     */
    secret: z.string().max(DATABASE_SECRET_MAX_LENGTH).optional()
});

// ------------------------------------------------------------------- bases

/** Le nombre de bases de l'espace, pour la tuile de l'accueil. */
export const databaseCount = {
    command: 'database.count' as const,
    input: z.object({}),
    output: z.object({ count: z.number().int().nonnegative() })
};

/** Les bases de l'espace, dans l'ordre de l'utilisateur. Lit le cache local. */
export const databaseList = {
    command: 'database.list' as const,
    input: z.object({}),
    output: z.object({ databases: z.array(databaseSchema) })
};

/** Une base, avec les projets qui s'en servent et ses alertes. */
export const databaseGet = {
    command: 'database.get' as const,
    input: z.object({ databaseId }),
    output: z.object({
        database: databaseSchema,
        usage: z.array(databaseUsageSchema),
        alerts: z.array(databaseAlertSchema)
    })
};

export const databaseAdd = {
    command: 'database.add' as const,
    input: z.object({
        engine: databaseEngineSchema,
        name: z.string().min(1).max(DATABASE_NAME_MAX_LENGTH),
        host: z.string().min(1).max(DATABASE_HOST_MAX_LENGTH),
        port: z.number().int().min(1).max(65535),
        database: z.string().min(1).max(DATABASE_NAME_MAX_LENGTH),
        username: z.string().max(DATABASE_USER_MAX_LENGTH),
        password: z.string().max(DATABASE_SECRET_MAX_LENGTH),
        access: accessInput,
        monitorEnabled: z.boolean(),
        intervalSeconds: z.number().int().min(60).max(86400)
    }),
    output: z.object({ database: databaseSchema })
};

/**
 * Modifie une base. `password` absent = on garde celui en place ; une chaîne
 * vide l'efface. Même convention que le secret du tunnel, et pour la même
 * raison : un secret rendu au client est un secret qu'on ne peut plus reprendre.
 */
export const databaseUpdate = {
    command: 'database.update' as const,
    input: z.object({
        databaseId,
        name: z.string().min(1).max(DATABASE_NAME_MAX_LENGTH),
        host: z.string().min(1).max(DATABASE_HOST_MAX_LENGTH),
        port: z.number().int().min(1).max(65535),
        database: z.string().min(1).max(DATABASE_NAME_MAX_LENGTH),
        username: z.string().max(DATABASE_USER_MAX_LENGTH),
        password: z.string().max(DATABASE_SECRET_MAX_LENGTH).optional(),
        access: accessInput,
        monitorEnabled: z.boolean(),
        intervalSeconds: z.number().int().min(60).max(86400)
    }),
    output: z.object({ database: databaseSchema })
};

/**
 * Retire une base de l'espace, avec ses alertes et toutes ses liaisons.
 *
 * Les projets liés ne sont **pas** touchés : ils perdent leur base, rien
 * d'autre. Le serveur distant, lui, n'est évidemment jamais atteint.
 */
export const databaseRemove = {
    command: 'database.remove' as const,
    input: z.object({ databaseId }),
    output: z.object({ databaseId })
};

/**
 * Range les bases de l'espace : `ids` est la liste **complète** dans son ordre
 * final. Une nouvelle base prend le rang suivant, donc la fin de la liste.
 */
export const databaseReorder = {
    command: 'database.reorder' as const,
    input: z.object({ ids: z.array(databaseId).min(1) }),
    output: z.object({ ids: z.array(databaseId) })
};

// ------------------------------------------------------- à la demande

/**
 * Essaie de joindre la base, maintenant.
 *
 * Ne lève **jamais** sur un échec de connexion : un serveur injoignable est une
 * réponse, pas une erreur de commande. Le message revient dans `error`, déjà
 * traduit, et l'interface le montre sans rien bloquer.
 */
export const databaseTest = {
    command: 'database.test' as const,
    input: z.object({ databaseId }),
    output: z.object({ probe: databaseProbeSchema })
};

/**
 * Relève l'inventaire maintenant : version du serveur, taille, nombre de
 * tables, et l'état des alertes. C'est ce que fait le relevé périodique, sur
 * demande explicite — ce qui le rend utile même sur une base au repos.
 */
export const databaseInspect = {
    command: 'database.inspect' as const,
    input: z.object({ databaseId }),
    output: z.object({ database: databaseSchema, probe: databaseProbeSchema })
};

/** Les tables de la base, lues chez le serveur au moment de la demande. */
export const databaseTableList = {
    command: 'database.tableList' as const,
    input: z.object({ databaseId }),
    output: z.object({ tables: z.array(databaseTableSchema) })
};

/**
 * Le contenu d'une table, page par page.
 *
 * Le nom de la table n'est pas interpolé tel quel : le serveur le confronte à
 * la liste réelle des tables avant de l'utiliser comme identifiant, ce qui est
 * la seule façon sûre de nommer une table dans une requête (un identifiant ne
 * peut pas être un paramètre lié).
 */
export const databaseTableRows = {
    command: 'database.tableRows' as const,
    input: z.object({
        databaseId,
        schema: z.string().max(DATABASE_NAME_MAX_LENGTH),
        table: z.string().min(1).max(DATABASE_NAME_MAX_LENGTH),
        offset: z.number().int().nonnegative().max(1_000_000).optional(),
        limit: z.number().int().positive().max(200).optional()
    }),
    output: z.object({ rows: databaseRowsSchema })
};

// ----------------------------------------------------------------- alertes

export const databaseAlertList = {
    command: 'database.alertList' as const,
    input: z.object({ databaseId }),
    output: z.object({ alerts: z.array(databaseAlertSchema) })
};

export const databaseAlertAdd = {
    command: 'database.alertAdd' as const,
    input: z.object({
        databaseId,
        name: z.string().min(1).max(DATABASE_ALERT_NAME_MAX_LENGTH),
        enabled: z.boolean(),
        combinator: databaseCombinatorSchema,
        conditions: z.array(databaseConditionSchema).min(1).max(8),
        message: z.string().min(1).max(DATABASE_ALERT_MESSAGE_MAX_LENGTH)
    }),
    output: z.object({ alert: databaseAlertSchema })
};

export const databaseAlertUpdate = {
    command: 'database.alertUpdate' as const,
    input: z.object({
        alertId,
        name: z.string().min(1).max(DATABASE_ALERT_NAME_MAX_LENGTH),
        enabled: z.boolean(),
        combinator: databaseCombinatorSchema,
        conditions: z.array(databaseConditionSchema).min(1).max(8),
        message: z.string().min(1).max(DATABASE_ALERT_MESSAGE_MAX_LENGTH)
    }),
    output: z.object({ alert: databaseAlertSchema })
};

export const databaseAlertRemove = {
    command: 'database.alertRemove' as const,
    input: z.object({ alertId }),
    output: z.object({ alertId })
};

/**
 * Évalue une alerte tout de suite et rend ce que chaque condition a mesuré,
 * **sans notifier personne**.
 *
 * C'est ce qui rend une condition écrivable : on voit le nombre que rend sa
 * requête avant de choisir un seuil, au lieu d'attendre une notification pour
 * découvrir qu'on s'est trompé de colonne.
 */
export const databaseAlertTest = {
    command: 'database.alertTest' as const,
    input: z.object({
        databaseId,
        combinator: databaseCombinatorSchema,
        conditions: z.array(databaseConditionSchema).min(1).max(8)
    }),
    output: z.object({
        firing: z.boolean(),
        values: z.array(z.number().nullable()),
        /** L'erreur de chaque condition, à sa place — `null` si elle a abouti. */
        errors: z.array(z.string().nullable()),
        elapsedMs: z.number().int().nonnegative()
    })
};

/** Une requête libre en lecture seule, pour mettre au point une condition. */
export const databaseQuery = {
    command: 'database.query' as const,
    input: z.object({ databaseId, sql: z.string().min(1).max(DATABASE_SQL_MAX_LENGTH) }),
    output: z.object({ rows: databaseRowsSchema })
};

export const databaseCommands = [
    databaseCount,
    databaseList,
    databaseGet,
    databaseAdd,
    databaseUpdate,
    databaseRemove,
    databaseReorder,
    databaseTest,
    databaseInspect,
    databaseTableList,
    databaseTableRows,
    databaseAlertList,
    databaseAlertAdd,
    databaseAlertUpdate,
    databaseAlertRemove,
    databaseAlertTest,
    databaseQuery
] as const;
