import {
    isExternalFeatureId,
    type ExternalFeatureId,
    type FeatureId,
    type WorkspaceFeatureId
} from './workspaceRole';

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
    id: FeatureId;
    /** Intitulé d'interface, en français (anglais pour un module externe). Jamais l'identifiant technique. */
    label: string;
    /**
     * Ce que le droit ouvre, en une phrase — affichée sous la ligne de la
     * fonctionnalité dans l'écran des rôles. Dit ce que `read` et `write`
     * recouvrent quand la différence n'est pas évidente.
     */
    description: string;
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
     * Les **sources** de la fonctionnalité : des réglages d'espace réutilisables
     * (un jeton Dokploy, un jeton GitHub, une destination d'archives) que
     * chaque élément ne fait que **désigner**. Corriger une source corrige d'un
     * coup tout ce qui s'en sert.
     *
     * Présent, il ouvre l'onglet « Sources » des réglages **à l'échelle de la
     * fonctionnalité**, le seul endroit où les sources se créent et se
     * corrigent. Les dialogues d'élément, eux, ne font que choisir dans la
     * liste, avec un bouton qui mène ici. `hint` est la phrase de tête de
     * l'onglet : elle dit ce qu'on y gère et qui s'en sert.
     *
     * Les canaux de notification suivent la même logique sans passer par ce
     * champ : ce sont les sources des émetteurs (chaque feature a les siens,
     * migration 091), gérées dans leur onglet « Notifications », qui porte
     * aussi le routage, indissociable (voir `notifies`).
     */
    sources?: { hint: string };
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
export const FEATURE_REGISTRY: readonly (FeatureDescriptor & { id: WorkspaceFeatureId })[] = [
    {
        id: 'devices',
        label: 'Appareils',
        description:
            'Lecture : voir les machines et leur supervision. Écriture : les appairer, renommer, retirer.',
        icon: 'server',
        notifies: false,
        hasItems: true,
        itemNoun: 'appareil',
        shareTier: 'never'
    },
    {
        id: 'sentinel',
        label: 'Sentinelle',
        description:
            'Lecture : constats et posture. Écriture : acquitter, régler, relancer un relevé.',
        icon: 'shield',
        notifies: true,
        hasItems: false,
        shareTier: 'never'
    },
    {
        id: 'weather',
        label: 'Météo',
        description: 'Les lieux suivis et leurs prévisions.',
        icon: 'cloud',
        notifies: false,
        hasItems: false,
        shareTier: 'never',
        sources: {
            hint: 'Les clés d’API des fournisseurs, communes à l’espace. Un lieu peut porter la sienne dans ses propres réglages ; sans elle, il retombe sur celle-ci.'
        }
    },
    {
        id: 'password',
        label: 'Mots de passe',
        description: 'Le coffre de mots de passe de l’espace.',
        icon: 'lock',
        notifies: false,
        hasItems: true,
        itemNoun: 'mot de passe',
        shareTier: 'never'
    },
    {
        id: 'notes',
        label: 'Notes',
        description: 'Notes et dossiers partagés de l’espace.',
        icon: 'notes',
        notifies: false,
        hasItems: true,
        itemNoun: 'note',
        shareTier: 'perItem'
    },
    {
        id: 'cloudsync',
        label: 'CloudSync',
        description: 'Partages de fichiers : dossiers, versions, appareils attachés.',
        icon: 'cloud',
        notifies: false,
        hasItems: true,
        itemNoun: 'partage',
        shareTier: 'never'
    },
    {
        id: 'uptime',
        label: 'Uptime',
        description:
            'Lecture : disponibilité et incidents. Écriture : déclarer et régler les services.',
        icon: 'uptime',
        notifies: true,
        hasItems: true,
        itemNoun: 'service',
        shareTier: 'open'
    },
    {
        id: 'mail',
        label: 'Mail',
        description: 'Comptes mail de l’espace, boîtes et messages.',
        icon: 'mail',
        notifies: false,
        hasItems: true,
        itemNoun: 'compte',
        shareTier: 'perItem'
    },
    {
        id: 'projects',
        label: 'Projets',
        description: 'Tableaux, jalons, cartes et discussions des projets.',
        icon: 'projects',
        notifies: false,
        hasItems: true,
        itemNoun: 'projet',
        shareTier: 'perItem'
    },
    {
        id: 'git',
        label: 'Git',
        description:
            'Lecture : dépôts, commits, PR. Écriture : déclarer un dépôt, poser le jeton du fournisseur.',
        icon: 'branch',
        notifies: false,
        hasItems: true,
        itemNoun: 'dépôt',
        sources: {
            hint: 'Les jetons GitHub de l’espace. Chaque dépôt en désigne un ; corriger un jeton corrige d’un coup tous les dépôts qui s’en servent.'
        },
        shareTier: 'open'
    },
    {
        id: 'deploy',
        label: 'Déploiements',
        description:
            'Lecture : cibles et historique. Écriture : poser la clé d’API et déclencher une mise en production.',
        icon: 'rocket',
        notifies: true,
        hasItems: true,
        itemNoun: 'cible',
        sources: {
            hint: 'Les accès Dokploy de l’espace (adresse de l’instance et clé d’API). Chaque cible en désigne un ; corriger un accès corrige d’un coup toutes les cibles qui s’en servent.'
        },
        shareTier: 'open'
    },
    {
        id: 'database',
        label: 'Bases de données',
        description:
            'Lecture : état et exploration. Écriture : déclarer une base, ses accès et ses alertes.',
        icon: 'database',
        notifies: true,
        hasItems: true,
        itemNoun: 'base',
        shareTier: 'open'
    },
    {
        id: 'backup',
        label: 'Sauvegardes',
        description:
            'Lecture : travaux et historique (la liste dit où dorment les copies). Écriture : destinations et déclenchement.',
        icon: 'archive',
        notifies: true,
        hasItems: true,
        itemNoun: 'travail',
        sources: {
            hint: 'Les destinations d’archives de l’espace : un dossier du serveur, une machine ou un bucket S3. Chaque travail écrit vers l’une d’elles ; la corriger corrige d’un coup tous les travaux qui s’en servent.'
        },
        shareTier: 'open'
    },
    {
        id: 'finance',
        label: 'Finances',
        description:
            'Le grand livre : comptes, opérations, budgets. La lecture seule est déjà lourde.',
        icon: 'finance',
        notifies: false,
        hasItems: true,
        itemNoun: 'compte',
        shareTier: 'never'
    },
    {
        id: 'audience',
        label: 'Audience',
        description:
            'Lecture : statistiques des sites. Écriture : déclarer un site, ses origines, sa clé.',
        icon: 'eye-open',
        notifies: false,
        hasItems: true,
        itemNoun: 'site',
        shareTier: 'open'
    },
    {
        id: 'osint',
        label: 'OSINT',
        description:
            'Lecture : recherches et historique. Écriture : purge et clés d’API des fournisseurs.',
        icon: 'search',
        notifies: false,
        hasItems: false,
        shareTier: 'never',
        sources: {
            hint: 'Les clés d’API des fournisseurs, toutes facultatives : chaque sonde libre fonctionne déjà, une clé ne fait qu’enrichir la sienne.'
        }
    }
];

const BY_ID = new Map<string, FeatureDescriptor>(FEATURE_REGISTRY.map((f) => [f.id, f]));

/**
 * Les modules **externes** enregistrés dans ce processus.
 *
 * Le registre natif est une constante ; celui-ci se remplit au chargement, une
 * fois par module installé, depuis la glue générée des deux bundles. Il ne
 * s'agit pas de chargement à chaud : la liste est figée à la compilation, la
 * carte n'existe que parce qu'un fichier ne peut pas être à la fois publié dans
 * ce package et généré par l'application qui l'installe.
 */
const EXTERNAL_BY_ID = new Map<ExternalFeatureId, FeatureDescriptor>();

/** Déclare le descripteur d'un module externe. Appelée par la glue générée. */
export function registerExternalFeature(desc: FeatureDescriptor & { id: ExternalFeatureId }): void {
    if (!isExternalFeatureId(desc.id)) {
        throw new Error(`registerExternalFeature: id invalide « ${desc.id} » (attendu x-<slug>)`);
    }
    EXTERNAL_BY_ID.set(desc.id, desc);
}

/** Le registre fusionné : les seize natives puis les modules, dans l'ordre d'enregistrement. */
export function allFeatureDescriptors(): readonly FeatureDescriptor[] {
    return EXTERNAL_BY_ID.size === 0
        ? FEATURE_REGISTRY
        : [...FEATURE_REGISTRY, ...EXTERNAL_BY_ID.values()];
}

/**
 * Le descriptif d'une fonctionnalité, native ou externe.
 *
 * Lève plutôt que de rendre `undefined` : un id natif vient d'un enum fermé,
 * donc une absence est un oubli d'entrée dans ce fichier ; un id externe
 * inconnu signifie que la glue générée n'a pas tourné, pas un cas d'exécution
 * à traiter chez l'appelant. Les écrans qui veulent tolérer un module absent
 * (une tuile orpheline) passent par {@link maybeFeatureDescriptor}.
 */
export function featureDescriptor(id: FeatureId): FeatureDescriptor {
    const found = maybeFeatureDescriptor(id);
    if (!found) throw new Error(`FEATURE_REGISTRY: aucune entrée pour « ${id} »`);
    return found;
}

/** Variante tolérante, pour les données qui peuvent survivre à un module retiré. */
export function maybeFeatureDescriptor(id: FeatureId): FeatureDescriptor | undefined {
    return isExternalFeatureId(id) ? EXTERNAL_BY_ID.get(id) : BY_ID.get(id);
}

/** L'intitulé seul — le besoin de très loin le plus courant. */
export function featureLabel(id: FeatureId): string {
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
 *
 * Les natives seulement : un module (Uptime, rapatrié) se déclare par
 * son manifest (`shareTier` autre que `'never'`), et le boot exige alors son
 * entrée `items`. Il n'a rien à inscrire ici.
 */
export const SHARE_WIRED_FEATURES: readonly WorkspaceFeatureId[] = [
    'deploy',
    'git',
    'audience',
    'backup'
];

/** Les fonctionnalités qui savent prévenir, dans l'ordre du registre. */
export const NOTIFYING_FEATURES: readonly WorkspaceFeatureId[] = FEATURE_REGISTRY.filter(
    (f) => f.notifies
).map((f) => f.id);
