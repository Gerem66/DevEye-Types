import { z } from 'zod';

/**
 * La page « Tests et débogage », réservée à l'administrateur du site : essais
 * de bout en bout, mesures, testeur de mails et suivi d'usage de DevEye.
 *
 * Toutes ces commandes déclarent `admin: true` côté serveur. Un essai dure
 * plus longtemps qu'une commande : `debug.e2eStart` et `debug.benchStart`
 * rendent aussitôt un identifiant, que la page suit par `debug.runGet`.
 */

const authorSchema = z.object({ id: z.number().int().positive(), username: z.string() });

export const debugInstanceSchema = z.object({
    /** `PUBLIC_ORIGIN` : ce qui distingue deux serveurs sur la même base. */
    origin: z.string(),
    environment: z.enum(['dev', 'test', 'prod']),
    version: z.string(),
    /** Millisecondes. */
    startedAt: z.number().int().nonnegative()
});

export const debugRunKindSchema = z.enum(['e2e', 'bench']);
export const debugRunStatusSchema = z.enum(['running', 'passed', 'failed', 'aborted']);

/** L'état d'une étape ou d'un scénario ; `pending` tant que son tour n'est pas venu. */
export const debugStepStatusSchema = z.enum(['pending', 'running', 'passed', 'failed', 'skipped']);

export const debugE2eStepSchema = z.object({
    label: z.string(),
    status: debugStepStatusSchema,
    durationMs: z.number().nonnegative().nullable(),
    /** Ce que l'étape a constaté, ou pourquoi elle a échoué. */
    detail: z.string().nullable()
});

export const debugE2eScenarioReportSchema = z.object({
    /** `<source>.<id>` : `core.account`, `notes.lifecycle`. */
    id: z.string(),
    label: z.string(),
    sourceLabel: z.string(),
    status: debugStepStatusSchema,
    /** Pourquoi il n'a pas tourné, quand il est ignoré. */
    skipReason: z.string().nullable(),
    durationMs: z.number().nonnegative().nullable(),
    steps: z.array(debugE2eStepSchema),
    /** Le ménage de fin de scénario : ce qui n'a pas pu être défait. */
    cleanup: z.object({ ok: z.boolean(), detail: z.string().nullable() }).nullable()
});

export const debugE2eReportSchema = z.object({
    kind: z.literal('e2e'),
    scenarios: z.array(debugE2eScenarioReportSchema),
    /** Comptes de test encore présents après le ménage final ; `null` tant qu'il n'a pas eu lieu. */
    residueAfter: z.number().int().nonnegative().nullable()
});

export const debugBenchProfileSchema = z.enum(['quick', 'full']);

/** Une sonde : ses durées en millisecondes, ou la raison qui l'a écartée. */
export const debugProbeResultSchema = z.object({
    id: z.string(),
    label: z.string(),
    n: z.number().int().nonnegative(),
    p50: z.number().nonnegative().nullable(),
    p95: z.number().nonnegative().nullable(),
    max: z.number().nonnegative().nullable(),
    mean: z.number().nonnegative().nullable(),
    errors: z.number().int().nonnegative(),
    skipped: z.string().nullable()
});

/** Ce que faisait le serveur pendant la mesure : de quoi comparer deux mesures prises sous des charges différentes. */
export const debugBenchContextSchema = z.object({
    loop: z.object({ p50: z.number(), p99: z.number(), max: z.number() }),
    rssMb: z.number(),
    heapMb: z.number(),
    cpuPct: z.number(),
    loadavg: z.tuple([z.number(), z.number(), z.number()]),
    wsSockets: z.number().int().nonnegative(),
    agentsOnline: z.number().int().nonnegative(),
    uptimeS: z.number().nonnegative(),
    version: z.string()
});

export const debugBenchReportSchema = z.object({
    kind: z.literal('bench'),
    profile: debugBenchProfileSchema,
    probes: z.array(debugProbeResultSchema),
    context: debugBenchContextSchema.nullable()
});

export const debugRunSchema = z.object({
    id: z.number().int().positive(),
    status: debugRunStatusSchema,
    /** Millisecondes. */
    startedAt: z.number().int().nonnegative(),
    finishedAt: z.number().int().nonnegative().nullable(),
    launchedBy: authorSchema.nullable(),
    report: z.discriminatedUnion('kind', [debugE2eReportSchema, debugBenchReportSchema])
});

export type DebugE2eStep = z.infer<typeof debugE2eStepSchema>;
export type DebugE2eScenarioReport = z.infer<typeof debugE2eScenarioReportSchema>;
export type DebugE2eReport = z.infer<typeof debugE2eReportSchema>;
export type DebugProbeResult = z.infer<typeof debugProbeResultSchema>;
export type DebugBenchContext = z.infer<typeof debugBenchContextSchema>;
export type DebugBenchReport = z.infer<typeof debugBenchReportSchema>;
export type DebugRun = z.infer<typeof debugRunSchema>;
export type DebugRunKind = z.infer<typeof debugRunKindSchema>;
export type DebugBenchProfile = z.infer<typeof debugBenchProfileSchema>;
export type DebugStepStatus = z.infer<typeof debugStepStatusSchema>;

export const debugOverview = {
    command: 'debug.overview' as const,
    input: z.object({}),
    output: z.object({
        instance: debugInstanceSchema,
        /** L'essai en cours, pour s'y rattacher après un rechargement de la page. */
        activeRun: z
            .object({ id: z.number().int().positive(), kind: debugRunKindSchema })
            .nullable()
    })
};

export const debugRunGet = {
    command: 'debug.runGet' as const,
    input: z.object({ runId: z.number().int().positive() }),
    output: debugRunSchema
};

/** Les derniers essais de ce serveur, du plus récent au plus ancien. */
export const debugRunList = {
    command: 'debug.runList' as const,
    input: z.object({ kind: debugRunKindSchema, limit: z.number().int().min(1).max(20) }),
    output: z.object({ runs: z.array(debugRunSchema) })
};

/** Arrête l'essai en cours ; son ménage a lieu quand même. */
export const debugRunAbort = {
    command: 'debug.runAbort' as const,
    input: z.object({ runId: z.number().int().positive() }),
    output: z.object({ runId: z.number().int().positive() })
};

export const debugE2eScenarioSchema = z.object({
    id: z.string(),
    label: z.string(),
    sourceLabel: z.string(),
    /** Pourquoi il ne peut pas tourner ici maintenant ; `null` s'il le peut. */
    skip: z.string().nullable()
});

export type DebugE2eScenario = z.infer<typeof debugE2eScenarioSchema>;

export const debugE2eCatalog = {
    command: 'debug.e2eCatalog' as const,
    input: z.object({}),
    output: z.object({
        scenarios: z.array(debugE2eScenarioSchema),
        /** Comptes de test présents en base en dehors de tout essai : ce qu'un essai interrompu a laissé. */
        residue: z.number().int().nonnegative(),
        /** Pourquoi aucun essai ne peut partir (site en maintenance), ou `null`. */
        blocked: z.string().nullable()
    })
};

export const debugE2eStart = {
    command: 'debug.e2eStart' as const,
    input: z.object({ scenarios: z.array(z.string().min(1).max(80)).min(1).max(50) }),
    output: z.object({ runId: z.number().int().positive() })
};

/** Supprime ce que des essais interrompus ont laissé. */
export const debugE2eSweep = {
    command: 'debug.e2eSweep' as const,
    input: z.object({}),
    output: z.object({ accounts: z.number().int().nonnegative() })
};

export const debugProbeSchema = z.object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    /** Mesurée par le navigateur, puis transmise avec la demande. */
    clientSide: z.boolean()
});

export type DebugProbe = z.infer<typeof debugProbeSchema>;

export const debugBenchCatalog = {
    command: 'debug.benchCatalog' as const,
    input: z.object({}),
    output: z.object({ probes: z.array(debugProbeSchema) })
};

const clientSamplesSchema = z.array(z.number().nonnegative().max(60_000)).max(50);

export const debugBenchStart = {
    command: 'debug.benchStart' as const,
    input: z.object({
        profile: debugBenchProfileSchema,
        /** Ce que le navigateur a mesuré juste avant, en millisecondes. */
        client: z.object({ wsRttMs: clientSamplesSchema, httpRttMs: clientSamplesSchema })
    }),
    output: z.object({ runId: z.number().int().positive() })
};

/** L'aller-retour le plus court possible : ce que le navigateur chronomètre. */
export const debugPing = {
    command: 'debug.ping' as const,
    input: z.object({}),
    output: z.object({ at: z.number().int().nonnegative() })
};

export const debugMailSenderKindSchema = z.enum(['server', 'workspace']);

export const debugMailSampleSchema = z.object({
    /** `<source>.<clé>` : `core.signupVerification`, `x-billing.renewal`. */
    key: z.string(),
    label: z.string(),
    sourceLabel: z.string(),
    sender: debugMailSenderKindSchema
});

export const debugWorkspaceSenderSchema = z.object({
    workspaceId: z.number().int().positive(),
    workspaceName: z.string(),
    accountId: z.number().int().positive(),
    label: z.string(),
    address: z.string()
});

export type DebugMailSample = z.infer<typeof debugMailSampleSchema>;
export type DebugWorkspaceSender = z.infer<typeof debugWorkspaceSenderSchema>;

export const debugMailCatalog = {
    command: 'debug.mailCatalog' as const,
    input: z.object({}),
    output: z.object({
        samples: z.array(debugMailSampleSchema),
        /** L'expéditeur du serveur (`SMTP_*`) : celui de l'inscription. */
        server: z.object({ configured: z.boolean(), from: z.string().nullable() }),
        /** Les boîtes prêtes à envoyer des espaces dont l'administrateur est propriétaire. */
        senders: z.array(debugWorkspaceSenderSchema)
    })
};

export const debugMailPreviewSchema = z.object({
    subject: z.string(),
    text: z.string(),
    html: z.string().nullable(),
    attachments: z.array(
        z.object({
            filename: z.string(),
            contentType: z.string(),
            size: z.number().int().nonnegative()
        })
    )
});

export type DebugMailPreview = z.infer<typeof debugMailPreviewSchema>;

export const debugMailPreview = {
    command: 'debug.mailPreview' as const,
    input: z.object({ key: z.string().min(1).max(120) }),
    output: debugMailPreviewSchema
};

export const debugMailSend = {
    command: 'debug.mailSend' as const,
    input: z.object({
        key: z.string().min(1).max(120),
        to: z.string().trim().toLowerCase().email().max(254),
        sender: z.discriminatedUnion('kind', [
            z.object({ kind: z.literal('server') }),
            z.object({
                kind: z.literal('workspace'),
                workspaceId: z.number().int().positive(),
                accountId: z.number().int().positive()
            })
        ])
    }),
    output: z.object({
        sentTo: z.string(),
        /** Une adresse d'essai : le serveur a retenu le mail au lieu de l'envoyer. */
        captured: z.boolean()
    })
};

export const debugTrackingSchema = z.object({
    /** L'origine de ce serveur : un réglage ne vaut que pour la sienne. */
    origin: z.string(),
    audienceInstalled: z.boolean(),
    config: z
        .object({
            siteId: z.number().int().positive(),
            /** `null` quand le site a disparu d'Audience. */
            siteName: z.string().nullable(),
            workspaceId: z.number().int().positive(),
            /** Les derniers caractères de la clé : elle ne quitte jamais le serveur. */
            keyHint: z.string(),
            enabled: z.boolean(),
            excludeAdmins: z.boolean(),
            updated: z.number().int().nonnegative(),
            updatedBy: authorSchema.nullable()
        })
        .nullable(),
    /** Les réglages des autres serveurs qui partagent cette base, en lecture seule. */
    others: z.array(z.object({ origin: z.string(), enabled: z.boolean() })),
    /** Depuis le démarrage de ce serveur. */
    counters: z.object({
        sent: z.number().int().nonnegative(),
        excluded: z.number().int().nonnegative()
    })
});

export type DebugTracking = z.infer<typeof debugTrackingSchema>;

export const debugTrackingGet = {
    command: 'debug.trackingGet' as const,
    input: z.object({}),
    output: debugTrackingSchema
};

/** Crée dans l'espace personnel de l'administrateur un site Audience réglé pour ce serveur, et s'y branche. */
export const debugTrackingCreate = {
    command: 'debug.trackingCreate' as const,
    input: z.object({}),
    output: debugTrackingSchema
};

/** Se branche sur un site existant, par sa clé. */
export const debugTrackingUse = {
    command: 'debug.trackingUse' as const,
    input: z.object({ key: z.string().trim().min(8).max(64) }),
    output: debugTrackingSchema
};

export const debugTrackingSet = {
    command: 'debug.trackingSet' as const,
    input: z.object({ enabled: z.boolean(), excludeAdmins: z.boolean() }),
    output: debugTrackingSchema
};

/** Débranche ce serveur ; le site et ses mesures restent dans Audience. */
export const debugTrackingClear = {
    command: 'debug.trackingClear' as const,
    input: z.object({}),
    output: debugTrackingSchema
};

export const debugCommands = [
    debugOverview,
    debugRunGet,
    debugRunList,
    debugRunAbort,
    debugE2eCatalog,
    debugE2eStart,
    debugE2eSweep,
    debugBenchCatalog,
    debugBenchStart,
    debugPing,
    debugMailCatalog,
    debugMailPreview,
    debugMailSend,
    debugTrackingGet,
    debugTrackingCreate,
    debugTrackingUse,
    debugTrackingSet,
    debugTrackingClear
] as const;
