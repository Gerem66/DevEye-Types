import type { WorkspaceFeatureId } from './workspaceRole';

/**
 * Ce qu'est une fonctionnalité, dit **une fois**.
 *
 * Le même renseignement vivait à trois endroits : `HOME_FEATURE_IDS` pour les
 * tuiles, `WORKSPACE_FEATURE_IDS` pour les droits, et les intitulés recopiés à la
 * main dans `RoleDialog` **et** dans `FEATURE_CATALOG`. Trois copies d'un même
 * couple identifiant / libellé, c'est la garantie qu'une fonctionnalité ajoutée
 * n'arrivera que dans deux d'entre elles — et c'est exactement ce qui était
 * arrivé à `monitoring`, présent dans un tableau et absent de l'autre sans que
 * rien ne le dise.
 *
 * Ce registre porte donc le **descriptif** ; les deux enums gardent leur rôle,
 * qui est de dire *où* une fonctionnalité a le droit d'apparaître. Ils ne sont
 * volontairement pas fusionnés : leur écart est documenté et voulu (`devices`
 * s'accorde mais n'a pas de tuile, `monitoring` a une tuile mais ne s'accorde
 * pas — voir `workspaceRole.ts`).
 *
 * Les écrans qui parcourent les fonctionnalités — la coquille de réglages, la
 * matrice de permissions, l'écran des rôles — lisent celui-ci et rien d'autre.
 */
export interface FeatureDescriptor {
    id: WorkspaceFeatureId;
    /** Intitulé d'interface, en français. Jamais l'identifiant technique. */
    label: string;
    /** Classe d'icône de `Styles/icons.css`, sans le préfixe `icon-`. */
    icon: string;
    /**
     * Cette fonctionnalité sait prévenir. Décide de l'onglet « Notifications »
     * de ses réglages — et, à elle seule, de l'existence du bouton pour les
     * quatre qui n'ont rien d'autre à régler.
     */
    notifies: boolean;
    /**
     * Elle tient une liste d'entités adressables (un service, une base, une
     * cible) sur lesquelles des réglages peuvent porter individuellement.
     *
     * Faux ne veut pas dire « aucune donnée » : Sentinelle a bien des constats,
     * mais on ne règle pas un constat, on règle la surveillance. Le critère est
     * « peut-on ouvrir les réglages de **cet** élément ? ».
     */
    hasItems: boolean;
    /**
     * Comment nommer un de ses éléments au singulier, pour les intitulés
     * d'écran (« Réglages de ce service »). Absent quand `hasItems` est faux.
     */
    itemNoun?: string;
    /**
     * Un de ses éléments peut-il être rendu visible depuis un autre espace ?
     *
     * La réponse tient entièrement au **chiffrement**, pas au goût : un élément
     * partagé reste chiffré sous la clé de son espace d'origine — c'est le
     * levier L3 de `WORKSPACES.md`, et y renoncer voudrait dire re-chiffrer sous
     * session vivante, ce que ce document range explicitement hors périmètre.
     *
     * Or seule la clé de l'**étage ouvert** est résoluble par le serveur seul.
     * D'où trois cas :
     *
     *  - `'open'` — toute la fonctionnalité vit à l'étage ouvert : partageable
     *    sans condition (Uptime, Bases, Déploiement, Git, Audience, Sauvegardes) ;
     *  - `'perItem'` — l'étage se choisit élément par élément. Une note
     *    ordinaire se partage, une note privée non ; un compte mail « open »
     *    oui, un compte « guarded » non. Le serveur tranche à la ligne, jamais
     *    la fonctionnalité en bloc ;
     *  - `'never'` — rien n'y est partageable, pour une raison propre à chaque
     *    cas (voir la note sous le registre).
     */
    shareTier: 'open' | 'perItem' | 'never';
}

/**
 * Ordre volontairement identique à celui de `workspaceFeatureIdSchema` : les
 * deux se lisent côte à côte, et une entrée manquante se voit.
 */
export const FEATURE_REGISTRY: readonly FeatureDescriptor[] = [
    {
        id: 'devices',
        label: 'Appareils',
        icon: 'server',
        notifies: false,
        hasItems: true,
        itemNoun: 'appareil',
        shareTier: 'never'
    },
    {
        id: 'sentinel',
        label: 'Sentinelle',
        icon: 'shield',
        notifies: true,
        hasItems: false,
        shareTier: 'never'
    },
    {
        id: 'weather',
        label: 'Météo',
        icon: 'cloud',
        notifies: false,
        hasItems: false,
        shareTier: 'never'
    },
    {
        id: 'password',
        label: 'Mots de passe',
        icon: 'lock',
        notifies: false,
        hasItems: true,
        itemNoun: 'mot de passe',
        shareTier: 'never'
    },
    {
        id: 'notes',
        label: 'Notes',
        icon: 'notes',
        notifies: false,
        hasItems: true,
        itemNoun: 'note',
        shareTier: 'perItem'
    },
    {
        id: 'cloudsync',
        label: 'CloudSync',
        icon: 'cloud',
        notifies: false,
        hasItems: true,
        itemNoun: 'partage',
        shareTier: 'never'
    },
    {
        id: 'uptime',
        label: 'Uptime',
        icon: 'uptime',
        notifies: true,
        hasItems: true,
        itemNoun: 'service',
        shareTier: 'open'
    },
    {
        id: 'mail',
        label: 'Mail',
        icon: 'mail',
        notifies: false,
        hasItems: true,
        itemNoun: 'compte',
        shareTier: 'perItem'
    },
    {
        id: 'projects',
        label: 'Projets',
        icon: 'projects',
        notifies: false,
        hasItems: true,
        itemNoun: 'projet',
        shareTier: 'perItem'
    },
    {
        id: 'git',
        label: 'Git',
        icon: 'branch',
        notifies: false,
        hasItems: true,
        itemNoun: 'dépôt',
        shareTier: 'open'
    },
    {
        id: 'deploy',
        label: 'Déploiements',
        icon: 'rocket',
        notifies: true,
        hasItems: true,
        itemNoun: 'cible',
        shareTier: 'open'
    },
    {
        id: 'database',
        label: 'Bases de données',
        icon: 'database',
        notifies: true,
        hasItems: true,
        itemNoun: 'base',
        shareTier: 'open'
    },
    {
        id: 'backup',
        label: 'Sauvegardes',
        icon: 'archive',
        notifies: true,
        hasItems: true,
        itemNoun: 'travail',
        shareTier: 'open'
    },
    {
        id: 'finance',
        label: 'Finances',
        icon: 'finance',
        notifies: false,
        hasItems: true,
        itemNoun: 'compte',
        shareTier: 'never'
    },
    {
        id: 'audience',
        label: 'Audience',
        icon: 'eye-open',
        notifies: false,
        hasItems: true,
        itemNoun: 'site',
        shareTier: 'open'
    },
    {
        id: 'osint',
        label: 'OSINT',
        icon: 'search',
        notifies: false,
        hasItems: false,
        shareTier: 'never'
    }
];

const BY_ID = new Map<string, FeatureDescriptor>(FEATURE_REGISTRY.map((f) => [f.id, f]));

/**
 * Le descriptif d'une fonctionnalité.
 *
 * Lève plutôt que de rendre `undefined` : l'identifiant vient d'un enum fermé,
 * donc une absence est un oubli d'entrée dans ce fichier, pas un cas d'exécution
 * à traiter chez l'appelant.
 */
export function featureDescriptor(id: WorkspaceFeatureId): FeatureDescriptor {
    const found = BY_ID.get(id);
    if (!found) throw new Error(`FEATURE_REGISTRY: aucune entrée pour « ${id} »`);
    return found;
}

/** L'intitulé seul — le besoin de très loin le plus courant. */
export function featureLabel(id: WorkspaceFeatureId): string {
    return featureDescriptor(id).label;
}

/**
 * Trois `never` méritent leur justification, parce qu'on pourrait croire le
 * contraire :
 *
 *  - **`devices`** a **déjà** son partage inter-espaces, antérieur et d'une
 *    autre nature : `device_workspaces` (migration 072) est une adhésion à part
 *    entière, pas une projection. Le mécanisme d'ici ne s'y superpose pas.
 *  - **`password`** vit toujours à l'étage gardé — c'est la promesse du coffre.
 *    Le serveur sait certes le lire quand le chiffrement par mot de passe est
 *    éteint, mais un partage dont la survie dépend d'un réglage de sécurité
 *    qu'on encourage n'est pas un partage.
 *  - **`cloudsync`** range ses contenus dans un magasin de blobs sur disque,
 *    chiffrés par la BMK et non par une clé d'espace : ce serait un autre
 *    chantier.
 */

/** Les fonctionnalités dont un élément **pourrait** voyager, côté chiffrement. */
export const SHAREABLE_FEATURES: readonly WorkspaceFeatureId[] = FEATURE_REGISTRY.filter(
    (f) => f.shareTier !== 'never'
).map((f) => f.id);

/**
 * Celles dont la **lecture élargie est réellement branchée**.
 *
 * `shareTier` dit ce que le chiffrement autorise ; cette liste dit ce que le
 * code fait. L'écart est volontaire et temporaire : projeter suppose que le
 * listage de la fonctionnalité sache aller chercher les lignes projetées et
 * choisir le bon codec ligne par ligne. Tant que ce n'est pas fait, la case
 * cocherait et rien n'apparaîtrait de l'autre côté.
 *
 * Partagée entre client et serveur **exprès** : le serveur refuse, le client
 * n'affiche pas l'onglet. Deux listes séparées auraient donné un onglet qui ne
 * mène nulle part — précisément ce que la coquille de réglages refuse.
 *
 * Brancher une fonctionnalité de plus : `listVisible` / `findVisible` dans son
 * dépôt, le codec par ligne dans son listage, une entrée ici.
 */
export const SHARE_WIRED_FEATURES: readonly WorkspaceFeatureId[] = [
    'uptime',
    'database',
    'deploy',
    'git',
    'audience',
    'backup'
];

/** Les fonctionnalités qui savent prévenir, dans l'ordre du registre. */
export const NOTIFYING_FEATURES: readonly WorkspaceFeatureId[] = FEATURE_REGISTRY.filter(
    (f) => f.notifies
).map((f) => f.id);
