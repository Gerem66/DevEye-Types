import { z } from 'zod';

/**
 * "Latest known state" report for a device — distinct from the time-series
 * metric snapshots. It carries slow-moving signals (OS info, security posture)
 * that don't belong in the per-cycle metric stream.
 *
 * The agent emits one on connect and then periodically. The server persists only
 * the most recent report per device (`devices.report_json`) and fans it out live.
 *
 * Every security field is nullable: collectors are best-effort and shell out to
 * OS tools that may be absent or require privileges. `null` means "unknown".
 *
 * Processes are *not* in the report: they ride along with each metric snapshot
 * (`metricSnapshotSchema.processes`) so every graph point has the process list of
 * that exact instant, and are historised under the same `ts`.
 */

/**
 * One *program* at sample time, aggregated across every process sharing its name
 * (modern apps are multi-process: a browser splits work across helpers, so a
 * single PID looks idle while the app is busy).
 *
 * Every field beyond CPU/memory is best-effort: the collectors read OS surfaces
 * that may be unavailable on a platform (`threads` on macOS) or unreadable
 * without privileges (`/proc/<pid>/io`, socket→process mapping for other users'
 * processes). Unknown is always `null` — never a misleading `0`. The UI can
 * explain *why* via `report.agent.privileged`.
 */
export const reportProcessSchema = z.object({
    name: z.string().min(1).max(128),
    /**
     * Chemin de l'exécutable, et **seconde moitié de la clé d'agrégation**.
     *
     * Agréger sur le seul nom fusionnait deux binaires homonymes rangés à des
     * endroits différents — exactement ce derrière quoi un imposteur se cache.
     * La clé est donc `(name, execPath)`, et deux `nginx` de chemins distincts
     * forment désormais deux entrées, ce qui est l'information utile.
     *
     * `null` = inconnu : agent trop ancien pour le renvoyer, ou chemin illisible
     * faute de droits. Les règles qui en dépendent restent alors muettes plutôt
     * que de conclure dans le vide (invariant 6 de Monitoring).
     */
    execPath: z.string().max(512).nullable().default(null),
    /**
     * L'exécutable a été effacé du disque mais le processus tourne toujours
     * (`/proc/<pid>/exe` pointe vers un chemin suffixé « (deleted) »).
     *
     * Un des indicateurs les plus francs d'un implant résident en mémoire, et il
     * ne coûte rien : le lien symbolique est déjà lu pour `execPath`. `null` là
     * où la plateforme ne l'expose pas (macOS, Windows).
     */
    deleted: z.boolean().nullable().default(null),
    /** Number of PIDs aggregated under this name. */
    instances: z.number().int().positive().default(1),
    /** Summed CPU%, cumulative across cores (can exceed 100 — divide by `os.cores`). */
    cpuPercent: z.number().min(0),
    /** Summed resident memory, in bytes. */
    memBytes: z.number().int().nonnegative(),
    /** Summed thread count; null on macOS (`ps` exposes no thread column). */
    threads: z.number().int().nonnegative().nullable().default(null),
    /** Owning OS account (the most frequent one among the aggregated PIDs). */
    user: z.string().max(64).nullable().default(null),
    /** Age of the oldest instance, in seconds. */
    uptimeSeconds: z.number().int().nonnegative().nullable().default(null),
    /** Cumulative bytes read; null when unreadable (privileges) or unsupported. */
    diskReadBytes: z.number().int().nonnegative().nullable().default(null),
    /** Cumulative bytes written; null when unreadable or unsupported. */
    diskWriteBytes: z.number().int().nonnegative().nullable().default(null),
    /**
     * Established connections *to* one of this program's listening ports
     * (inbound) and away from it (outbound). Byte counters per process are not
     * collected: no OS exposes them without eBPF/packet capture.
     */
    connIn: z.number().int().nonnegative().nullable().default(null),
    connOut: z.number().int().nonnegative().nullable().default(null),
    /** Ports this program listens on (ascending, deduped). */
    listenPorts: z.array(z.number().int().min(0).max(65535)).max(32).default([])
});

export type ReportProcess = z.infer<typeof reportProcessSchema>;

/**
 * Per-device process capture mode (set from the UI, pushed to the agent):
 * - `off`: don't collect processes at all (saves the most space);
 * - `top`: only the ~20 heaviest (scored on CPU% + memory%);
 * - `all`: every process.
 */
export const processCaptureSchema = z.enum(['off', 'top', 'all']);
export type ProcessCapture = z.infer<typeof processCaptureSchema>;

/**
 * Kind of a stored process sample = the capture mode in effect when it was
 * taken (`top` or `all`; `off` produces no sample). Recorded per-sample so the
 * UI can label history correctly even after the mode later changes.
 */
export const processKindSchema = z.enum(['top', 'all']);
export type ProcessKind = z.infer<typeof processKindSchema>;

/**
 * A stored process list at one instant. **Read model only**: the agent no longer
 * emits it on its own — processes travel inside `metricSnapshotSchema.processes`
 * so a graph point and its process list always share one `ts`. This is what
 * `metrics.processesAt` returns when reading history back.
 */
export const processSampleSchema = z.object({
    ts: z.number().int().positive(),
    kind: processKindSchema,
    processes: z.array(reportProcessSchema).max(2000)
});

export type ProcessSample = z.infer<typeof processSampleSchema>;

/**
 * Contrôle d'accès obligatoire actif sur l'hôte. C'est ce qui borne les dégâts
 * d'un service compromis, d'où sa place dans la posture.
 */
export const mandatoryAccessControlSchema = z.enum([
    'selinux-enforcing',
    'selinux-permissive',
    'apparmor',
    'none'
]);
export type MandatoryAccessControl = z.infer<typeof mandatoryAccessControlSchema>;

/** Security posture of the monitored machine. `null` = could not be determined. */
export const deviceSecuritySchema = z.object({
    /** Host firewall enabled (macOS ALF / Linux ufw|firewalld). */
    firewall: z.boolean().nullable(),
    /** System volume encrypted (macOS FileVault / Linux LUKS). */
    diskEncryption: z.boolean().nullable(),
    /** System Integrity Protection (macOS only; null elsewhere). */
    sip: z.boolean().nullable(),
    /** Count of pending OS updates (null when not collected, e.g. macOS). */
    pendingUpdates: z.number().int().nonnegative().nullable(),
    /**
     * Correctifs de **sécurité** en attente, distingués du total.
     *
     * La distinction porte toute la valeur du signal : quarante mises à jour
     * dont aucune de sécurité n'est qu'un retard d'entretien, tandis qu'une
     * seule faille non corrigée est une porte. Ces champs sont facultatifs et
     * défaillent à `null` — un agent antérieur à Sentinelle n'en dit rien, et
     * `posture.updates_stale` reste alors muette.
     */
    pendingSecurityUpdates: z.number().int().nonnegative().nullable().default(null),
    /** Unix ms du dernier contrôle des mises à jour ; sert à mesurer l'ancienneté. */
    updatesCheckedAt: z.number().int().positive().nullable().default(null),
    /** `PermitRootLogin` du serveur SSH ; `null` s'il n'y en a pas, ou config illisible. */
    sshRootLogin: z.boolean().nullable().default(null),
    /** `PasswordAuthentication` du serveur SSH. */
    sshPasswordAuth: z.boolean().nullable().default(null),
    /** SELinux / AppArmor. */
    mandatoryAccessControl: mandatoryAccessControlSchema.nullable().default(null),
    /** Des correctifs déjà installés attendent un redémarrage pour prendre effet. */
    rebootRequired: z.boolean().nullable().default(null)
});

export type DeviceSecurity = z.infer<typeof deviceSecuritySchema>;

/** One mounted disk/volume, for the per-disk breakdown (multi-disk machines). */
export const reportDiskSchema = z.object({
    /** Representative mount point (e.g. `/` or `/Volumes/Data`). */
    mount: z.string().min(1).max(256),
    usedBytes: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative()
});

export type ReportDisk = z.infer<typeof reportDiskSchema>;

/**
 * One listening socket on the monitored machine.
 *
 * `address` is the bind address (`0.0.0.0`/`::` = all interfaces,
 * `127.0.0.1`/`::1` = loopback only, anything else = one specific interface), so
 * the UI can tell world-exposed ports from local ones and group them per
 * interface. One entry per *bind address*: a dual-stack service legitimately
 * yields two entries (`0.0.0.0:22` and `:::22`) which the UI merges into a
 * single bubble.
 */
export const openPortSchema = z.object({
    proto: z.enum(['tcp', 'udp']),
    port: z.number().int().min(0).max(65535),
    address: z.string().max(64),
    /** IPv6 scope id — the interface a link-local socket is bound to (`fe80::1%eth0`). */
    zone: z.string().max(64).nullable().default(null),
    /** Owning process id; null when the mapping needs privileges we don't have. */
    pid: z.number().int().nonnegative().nullable().default(null),
    /** Owning program name; null for the same reason as `pid`. */
    process: z.string().max(128).nullable().default(null)
});

export type OpenPort = z.infer<typeof openPortSchema>;

/**
 * One established TCP connection at collection time — the detail behind the
 * `activeConnections` metric (which only carries the count). Addresses are kept
 * as strings so both IPv4 and IPv6 peers display as-is.
 */
export const tcpConnectionSchema = z.object({
    localAddress: z.string().max(64),
    localPort: z.number().int().min(0).max(65535),
    remoteAddress: z.string().max(64),
    remotePort: z.number().int().min(0).max(65535)
});

export type TcpConnection = z.infer<typeof tcpConnectionSchema>;

/**
 * The agent's own runtime identity. Lets the UI explain *why* some best-effort
 * probes are limited — chiefly whether it runs with privileges (root/elevated).
 */
export const agentServiceScopeSchema = z.enum(['none', 'user', 'system']);
export type AgentServiceScope = z.infer<typeof agentServiceScopeSchema>;

export const agentInfoSchema = z.object({
    /** Running as root (Unix euid 0) / elevated (Windows). */
    privileged: z.boolean(),
    /** OS account the agent runs as (e.g. `root`, `deploy`). */
    user: z.string().max(128),
    /**
     * How the agent is installed for persistence: `none` (transient run), `user`
     * (per-user autostart, login session) or `system` (root/system service, boot).
     * Optional + defaulted so reports from agents predating this field still parse.
     */
    serviceScope: agentServiceScopeSchema.default('none'),
    /** True when launched by a service manager (so a self-update just exits to be relaunched). */
    managed: z.boolean().default(false),
    /**
     * Ce que cet agent sait relever, déclaré par lui-même.
     *
     * Sans cette liste, rien ne distingue « la sonde a échoué » d'« un agent
     * trop ancien pour l'avoir ». Les deux rendent `null`, et l'interface
     * afficherait le même vide pour deux situations qui n'appellent pas la même
     * réaction — mettre l'agent à jour, ou aller regarder la machine.
     *
     * On ne peut pas s'en remettre à la version : elle est injectée à la
     * compilation par la CI et vaut `0.0.0` sur une construction locale. Une
     * capacité déclarée est de toute façon plus honnête qu'un numéro dont on
     * déduirait ce qu'il contient.
     *
     * Vide par défaut : un agent antérieur à Sentinelle ne dit rien, et c'est
     * exactement ce qu'il faut comprendre.
     */
    probes: z.array(z.string().max(32)).max(16).default([])
});

export type AgentInfo = z.infer<typeof agentInfoSchema>;

/**
 * Processor identity (best-effort, read from `sysinfo`). `frequencyMhz` is the
 * nominal/base frequency the OS reports — `null` when it couldn't be read.
 */
export const cpuInfoSchema = z.object({
    /** Brand string, e.g. "Apple M1 Pro" or "Intel(R) Core(TM) i7-1185G7". */
    model: z.string().max(256),
    /** Vendor id (e.g. `GenuineIntel`, `AuthenticAMD`); null when unknown. */
    vendor: z.string().max(128).nullable().default(null),
    /** Physical cores; null when the OS can't report them. */
    physicalCores: z.number().int().nonnegative().nullable().default(null),
    /** Logical cores (threads). */
    logicalCores: z.number().int().nonnegative(),
    /** Nominal/base frequency in MHz; null when unknown. */
    frequencyMhz: z.number().int().nonnegative().nullable().default(null)
});

export type CpuInfo = z.infer<typeof cpuInfoSchema>;

/**
 * A network interface's inferred class. Best-effort: derived from the OS hardware
 * port (macOS) or the interface name, so `other`/`virtual` cover anything we
 * can't confidently bucket.
 */
export const netInterfaceKindSchema = z.enum([
    'wifi',
    'ethernet',
    'bluetooth',
    'loopback',
    'virtual',
    'other'
]);
export type NetInterfaceKind = z.infer<typeof netInterfaceKindSchema>;

/** One network interface on the host (name + hardware address + inferred kind). */
export const netInterfaceSchema = z.object({
    name: z.string().min(1).max(128),
    kind: netInterfaceKindSchema,
    /** MAC address, `null` when unavailable or all-zero (e.g. loopback). */
    mac: z.string().max(64).nullable().default(null),
    /**
     * IP addresses assigned to the interface. Lets the ports view attribute a
     * bind address to the interface it belongs to. Truncated rather than
     * rejected (an interface can carry many addresses), `[]` when unknown.
     */
    addresses: z
        .preprocess(
            (v) => (Array.isArray(v) ? v.slice(0, 16) : v),
            z.array(z.string().max(64)).max(16)
        )
        .catch([])
        .default([])
});

export type NetInterface = z.infer<typeof netInterfaceSchema>;

/**
 * Static hardware inventory of the monitored machine — slow-moving facts (CPU,
 * RAM, GPU, connectivity) carried alongside the report. Every list is best-effort
 * and may be empty; `bluetooth` is `null` when no adapter was detected.
 */
export const deviceHardwareSchema = z.object({
    cpu: cpuInfoSchema,
    /** Total physical RAM, in bytes. */
    memoryTotalBytes: z.number().int().nonnegative(),
    /** GPU model names (best-effort; may be empty). Truncated, never fatal. */
    gpus: z
        .preprocess(
            (v) => (Array.isArray(v) ? v.slice(0, 16) : v),
            z.array(z.string().max(256)).max(16)
        )
        .catch([])
        .default([]),
    /**
     * Network interfaces (best-effort; may be empty). A container host can expose
     * dozens of virtual `veth*`/`br-*` devices, so an over-long list is *truncated*
     * (and any residual error degrades to `[]`) rather than rejecting the whole
     * report — one noisy field must never drop the agent's entire posture, which is
     * validated at the agent socket's ingress (`deviceReportSchema`).
     */
    network: z
        .preprocess(
            (v) => (Array.isArray(v) ? v.slice(0, 64) : v),
            z.array(netInterfaceSchema).max(64)
        )
        .catch([])
        .default([]),
    /** Bluetooth adapter descriptor; `null` when none detected. */
    bluetooth: z.string().max(256).nullable().default(null)
});

export type DeviceHardware = z.infer<typeof deviceHardwareSchema>;

export const deviceReportSchema = z.object({
    /** Unix ms when this report was collected on the agent. */
    collectedAt: z.number().int().positive(),
    os: z.object({
        name: z.string().min(1).max(64),
        version: z.string().max(64),
        arch: z.string().max(32),
        /** Logical CPU cores, for interpreting the load average (0 = unknown). */
        cores: z.number().int().nonnegative().default(0)
    }),
    security: deviceSecuritySchema,
    /** Per-disk usage (deduped across shared APFS volumes). Empty if unknown. */
    disks: z.array(reportDiskSchema).default([]),
    /**
     * The agent's runtime identity (privilege level + account). `null` on legacy
     * reports stored before this field existed; the agent always sends it now.
     */
    agent: agentInfoSchema.nullable().default(null),
    /**
     * Static hardware inventory (CPU, RAM, GPU, network, bluetooth). `null` on
     * legacy reports stored before this field existed; the agent always sends it.
     */
    hardware: deviceHardwareSchema.nullable().default(null),
    /**
     * Listening sockets, one entry per bind address. `null` = not collected
     * (legacy report); `[]` = collected and none found. Sorted by port, capped at
     * 500 by the agent.
     */
    openPorts: z.array(openPortSchema).max(500).nullable().default(null),
    /**
     * Established TCP connections (the detail behind the `activeConnections`
     * metric). `null` = not collected (legacy report); `[]` = collected and none.
     * Sorted, capped at 500 by the agent.
     */
    connections: z.array(tcpConnectionSchema).max(500).nullable().default(null)
});

export type DeviceReport = z.infer<typeof deviceReportSchema>;

// ─────────────────────── relevés Sentinelle (persistance, auth) ──────────────
//
// Deux relevés de plus, volontairement **hors** de `deviceReportSchema`.
//
// Le rapport est un « dernier état connu » : le serveur n'en garde qu'un par
// appareil, écrasé à chaque envoi. Cela convient à la posture, pas à ces
// deux-là. Le manifeste de persistance est trop gros pour être réécrit en
// entier chaque heure dans `devices.report_json`, et la fenêtre
// d'authentification est **additive** — l'écraser perdrait des tentatives, ce
// qui est précisément ce qu'on cherche à compter.

/**
 * Une entrée d'une surface de persistance : l'endroit où un programme s'installe
 * pour survivre au redémarrage.
 *
 * **Jamais le contenu du fichier** — seulement son empreinte et ses métadonnées.
 * C'est ce qui rend la sonde acceptable sur une machine partagée : elle prouve
 * qu'un fichier a changé sans jamais révéler ce qu'il contient, et un `sha256`
 * suffit entièrement au diff que le serveur en fait.
 */
export const persistenceEntrySchema = z.object({
    /** Famille d'origine : `cron`, `systemd`, `launchd`, `authorized_keys`, `sudoers`, `run_key`, `scheduled_task`… */
    surface: z.string().min(1).max(48),
    path: z.string().min(1).max(512),
    sha256: z.string().length(64),
    sizeBytes: z.number().int().nonnegative(),
    /** Unix ms de dernière modification ; `null` si le système ne l'expose pas. */
    mtime: z.number().int().nonnegative().nullable().default(null),
    /** Mode POSIX en octal (`0644`) ; `null` sur Windows. */
    mode: z.string().max(8).nullable().default(null),
    /** Propriétaire du fichier ; `null` quand illisible. */
    owner: z.string().max(64).nullable().default(null)
});
export type PersistenceEntry = z.infer<typeof persistenceEntrySchema>;

/** Plafond d'entrées d'un manifeste, aligné sur la borne de l'agent. */
export const PERSISTENCE_ENTRY_LIMIT = 2000;

export const integrityReportSchema = z.object({
    /** Unix ms de la collecte sur l'agent. */
    collectedAt: z.number().int().positive(),
    entries: z.array(persistenceEntrySchema).max(PERSISTENCE_ENTRY_LIMIT),
    /**
     * Le plafond a été atteint. Le serveur **n'émet alors aucun
     * `persistence.removed`** : un manifeste tronqué ne prouve pas qu'une entrée
     * a disparu, seulement qu'on a cessé de regarder.
     */
    truncated: z.boolean().default(false)
});
export type IntegrityReport = z.infer<typeof integrityReportSchema>;

/**
 * Une adresse et ce qu'elle a tenté, sur la fenêtre écoulée.
 *
 * `users` porte les comptes **visés**, pas les comptes d'utilisateurs suivis :
 * savoir qu'une adresse chinoise a essayé `root`, `admin` puis `oracle` est ce
 * qui distingue un balayage automatique d'une erreur de frappe.
 */
export const authSourceSchema = z.object({
    address: z.string().min(1).max(64),
    failed: z.number().int().nonnegative(),
    accepted: z.number().int().nonnegative(),
    users: z.array(z.string().max(64)).max(16).default([])
});
export type AuthSource = z.infer<typeof authSourceSchema>;

/** Une authentification **réussie**, seul événement nominatif qu'on remonte. */
export const authLoginSchema = z.object({
    user: z.string().max(64),
    address: z.string().max(64).nullable().default(null),
    /** `publickey`, `password`, `keyboard-interactive`, `gssapi`… */
    method: z.string().max(32).nullable().default(null),
    at: z.number().int().positive()
});
export type AuthLogin = z.infer<typeof authLoginSchema>;

export const AUTH_SOURCE_LIMIT = 50;
export const AUTH_LOGIN_LIMIT = 50;

/**
 * Les issues d'authentification sur une fenêtre glissante.
 *
 * Des **compteurs**, pas un flux de journal : l'agent lit les journaux, en
 * extrait des totaux et une liste bornée d'adresses, et n'envoie que cela. Ce
 * n'est pas une optimisation de taille, c'est la frontière de la feature — un
 * flux brut aurait remonté des lignes de commande sudo et des noms de service,
 * c'est-à-dire l'activité des gens.
 */
export const authWindowSchema = z.object({
    /** Bornes de la fenêtre, unix ms. `from` = fin de la fenêtre précédente. */
    from: z.number().int().nonnegative(),
    to: z.number().int().positive(),
    failed: z.number().int().nonnegative(),
    accepted: z.number().int().nonnegative(),
    /** Tentatives visant un compte inexistant : signature d'un balayage. */
    invalidUser: z.number().int().nonnegative(),
    /** Nombre d'élévations sudo, sans les commandes exécutées. */
    sudo: z.number().int().nonnegative(),
    /** Comptes système créés pendant la fenêtre. */
    newAccounts: z.array(z.string().max(64)).max(16).default([]),
    /** Sessions root ouvertes directement. */
    rootLogins: z.number().int().nonnegative().default(0),
    topSources: z.array(authSourceSchema).max(AUTH_SOURCE_LIMIT).default([]),
    logins: z.array(authLoginSchema).max(AUTH_LOGIN_LIMIT).default([]),
    /**
     * La source n'a pas pu être lue (pas de journal, pas les droits). Distinguer
     * « zéro tentative » de « je n'ai pas pu regarder » : sans ce drapeau, une
     * machine aveugle passerait pour une machine tranquille.
     */
    unavailable: z.boolean().default(false)
});
export type AuthWindow = z.infer<typeof authWindowSchema>;
