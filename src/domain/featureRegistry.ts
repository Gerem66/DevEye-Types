import {
    isExternalFeatureId,
    type ExternalFeatureId,
    type FeatureId,
    type WorkspaceFeatureId
} from './workspaceRole';

/**
 * Ce qu'est une fonctionnalité, dit une fois : le descriptif que lisent les
 * écrans qui parcourent les fonctionnalités (coquille de réglages, matrice de
 * permissions, écran des rôles). `HOME_FEATURE_IDS` et `WORKSPACE_FEATURE_IDS`
 * gardent leur rôle : dire où une fonctionnalité a le droit d'apparaître.
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
     * Cette fonctionnalité sait prévenir : décide de l'onglet « Notifications »
     * de ses réglages.
     */
    notifies: boolean;
    /**
     * Elle tient des entités adressables sur lesquelles des réglages portent
     * individuellement. Le critère : « peut-on ouvrir les réglages de CET
     * élément ? » (Sentinelle a des constats, mais on règle la surveillance).
     */
    hasItems: boolean;
    /**
     * Comment nommer un de ses éléments au singulier, pour les intitulés
     * d'écran (« Réglages de ce service »). Absent quand `hasItems` est faux.
     */
    itemNoun?: string;
    /**
     * Le genre de `itemNoun`, sans quoi les intitulés qui le précèdent d'un
     * déterminant ne peuvent pas s'accorder (« cette note » contre « cet
     * appareil »). Masculin par défaut : c'est le cas le plus courant, et un
     * module qui l'omet lit au moins juste la moitié du temps.
     */
    itemNounGender?: 'm' | 'f';
    /**
     * Les sources de la fonctionnalité : des réglages d'espace réutilisables
     * (un jeton, une destination) que chaque élément ne fait que désigner.
     * Ouvre l'onglet « Sources » à l'échelle de la fonctionnalité, seul endroit
     * où elles se créent et se corrigent ; `hint` est la phrase de tête de
     * l'onglet. Les canaux de notification suivent la même logique dans
     * l'onglet « Notifications » (voir `notifies`).
     */
    sources?: { hint: string };
    /**
     * Un de ses éléments peut-il être rendu visible depuis un autre espace ?
     * Décidé par le chiffrement : un élément partagé reste chiffré sous la clé
     * de son espace d'origine, et seule la clé de l'étage ouvert est résoluble
     * par le serveur seul.
     *  - `'open'` : toute la fonctionnalité vit à l'étage ouvert ;
     *  - `'perItem'` : l'étage se choisit élément par élément, le serveur
     *    tranche à la ligne ;
     *  - `'never'` : rien n'y est partageable (voir la note sous le registre).
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
        shareTier: 'open'
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
        itemNounGender: 'f',
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
        itemNounGender: 'f',
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
        itemNounGender: 'f',
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
    },
    {
        id: 'cve',
        label: 'Veille CVE',
        description:
            'Lecture : le fil des vulnérabilités et la recherche. Écriture : épingler, et poser la clé du NVD.',
        icon: 'bug',
        notifies: false,
        hasItems: false,
        shareTier: 'never',
        sources: {
            hint: 'La clé d’API du NVD, facultative : sans elle le catalogue se remplit quand même, elle ne fait que relever le quota de requêtes.'
        }
    },
    {
        id: 'mailserver',
        label: 'Serveur mail',
        description:
            'Lecture : les adresses hébergées et leur activité. Écriture : créer une adresse, régler son quota, déclarer un domaine.',
        icon: 'at',
        notifies: false,
        hasItems: true,
        itemNoun: 'adresse',
        itemNounGender: 'f',
        shareTier: 'open'
    }
];

const BY_ID = new Map<string, FeatureDescriptor>(FEATURE_REGISTRY.map((f) => [f.id, f]));

/**
 * Les modules externes enregistrés dans ce processus, remplis au chargement
 * par la glue générée. Pas de chargement à chaud : la liste est figée à la
 * compilation.
 */
const EXTERNAL_BY_ID = new Map<ExternalFeatureId, FeatureDescriptor>();

/** Déclare le descripteur d'un module externe. Appelée par la glue générée. */
export function registerExternalFeature(desc: FeatureDescriptor & { id: ExternalFeatureId }): void {
    if (!isExternalFeatureId(desc.id)) {
        throw new Error(`registerExternalFeature: id invalide « ${desc.id} » (attendu x-<slug>)`);
    }
    EXTERNAL_BY_ID.set(desc.id, desc);
}

/** Le registre fusionné : les natives puis les modules, dans l'ordre d'enregistrement. */
export function allFeatureDescriptors(): readonly FeatureDescriptor[] {
    return EXTERNAL_BY_ID.size === 0
        ? FEATURE_REGISTRY
        : [...FEATURE_REGISTRY, ...EXTERNAL_BY_ID.values()];
}

/**
 * Le descriptif d'une fonctionnalité, native ou externe. Lève plutôt que de
 * rendre `undefined` : une absence est un oubli d'entrée ici, ou une glue
 * générée qui n'a pas tourné. Pour tolérer un module absent, voir
 * {@link maybeFeatureDescriptor}.
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
 * Élision devant voyelle ou h muet. Le `h` aspiré ferait exception, mais aucun
 * nom d'élément n'en commence, et un module qui en introduirait un lirait mal
 * une fois plutôt que de faire porter le doute à tous les autres.
 */
function elides(noun: string): boolean {
    const first = noun
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .charAt(0)
        .toLowerCase();
    return 'aeiouyh'.includes(first);
}

function capitalise(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Le nom d'un élément décliné, pour les intitulés qui le précèdent d'un
 * déterminant : « cet appareil », « cette note », « le dépôt ». Sans ces
 * formes, une phrase écrite une fois pour toutes lit faux dès que le nom
 * change de genre ou commence par une voyelle. Le repli est « élément »,
 * masculin, comme le mot lui-même.
 */
export function itemNounForms(id: FeatureId): {
    /** « appareil » */
    noun: string;
    /** « cet appareil » */
    dem: string;
    /** « Cet appareil » */
    Dem: string;
    /** « l'appareil » */
    def: string;
    /** « L'appareil » */
    Def: string;
    /** « de l'appareil » */
    ofThe: string;
} {
    const d = maybeFeatureDescriptor(id);
    const noun = d?.itemNoun ?? 'élément';
    const feminine = (d?.itemNounGender ?? 'm') === 'f';
    const vowel = elides(noun);

    const dem = feminine ? `cette ${noun}` : vowel ? `cet ${noun}` : `ce ${noun}`;
    const def = vowel ? `l\u2019${noun}` : `${feminine ? 'la' : 'le'} ${noun}`;
    const ofThe = vowel ? `de l\u2019${noun}` : feminine ? `de la ${noun}` : `du ${noun}`;

    return { noun, dem, Dem: capitalise(dem), def, Def: capitalise(def), ofThe };
}

/**
 * Les deux `never` : `password` vit toujours à l'étage gardé ; `cloudsync`
 * range ses contenus dans un magasin de blobs chiffrés par la BMK, pas par une
 * clé d'espace.
 */

/** Les fonctionnalités dont un élément **pourrait** voyager, côté chiffrement. */
export const SHAREABLE_FEATURES: readonly WorkspaceFeatureId[] = FEATURE_REGISTRY.filter(
    (f) => f.shareTier !== 'never'
).map((f) => f.id);

/**
 * Celles dont la lecture élargie est réellement branchée : `shareTier` dit ce
 * que le chiffrement autorise, cette liste ce que le code fait. Partagée entre
 * client et serveur : le serveur refuse, le client n'affiche pas l'onglet.
 * Brancher une native : `listVisible` / `findVisible` dans son dépôt, le codec
 * par ligne dans son listage, une entrée ici. Un module se déclare par son
 * manifest (`shareTier` autre que `'never'`) et son entrée `items`.
 */
export const SHARE_WIRED_FEATURES: readonly WorkspaceFeatureId[] = ['backup'];

/** Les fonctionnalités qui savent prévenir, dans l'ordre du registre. */
export const NOTIFYING_FEATURES: readonly WorkspaceFeatureId[] = FEATURE_REGISTRY.filter(
    (f) => f.notifies
).map((f) => f.id);
