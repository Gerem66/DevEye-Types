import type { ComponentType, ReactNode } from 'react';

/**
 * Client-side SDK contracts: what your package's `./client` entry exports and
 * what your components receive.
 *
 * Your client code imports its runtime helpers (UI kit, `useResource`,
 * `featureApi`, live hooks, permissions) from `deveye-sdk-client`, which the
 * app provides when your module is compiled in. This file only carries the
 * shapes both sides must agree on.
 */

/**
 * The scope a settings panel is opened for. An item id is a number for every
 * row-keyed feature (the default), a string for a device (a UUID): a module
 * whose items are strings types its panels `SettingsPanelProps<string>`. The
 * shell's own sections (sharing, permissions, notifications) key on the number.
 */
export type SdkSettingsScope<Id extends number | string = number> =
    { kind: 'feature' } | { kind: 'item'; itemId: Id; itemLabel: string };

export interface SettingsPanelProps<Id extends number | string = number> {
    scope: SdkSettingsScope<Id>;
    /** Caller has `write` on the feature. Render read-only when false. */
    canWrite: boolean;
}

export interface FeatureViewProps {
    /** Closes the full view (the popup over the grid). */
    closeFeature(): void;
}

/**
 * Your package's `./client` export.
 */
export interface FeatureClient {
    /**
     * The card body on the home grid. NO props, like every native widget:
     * data comes from `useResource`, so the card and the full view share one
     * cache and refresh together.
     */
    Widget: ComponentType;
    /** The full view, opened when the card expands. */
    Full: ComponentType<FeatureViewProps>;
    /**
     * Panels for the manifest's settings tabs that need one: `'general'`,
     * `'sources'`, `'encryption'`, and any custom tab id. Generic tabs
     * (`'notifications'`, `'permissions'`) need no panel.
     */
    // `never` as the id: a panel typed for numbers and one typed for strings
    // are both assignable here (props are contravariant), and the shell, which
    // holds a `number | string`, casts once at that boundary.
    settingsPanels?: Readonly<Record<string, ComponentType<SettingsPanelProps<never>>>>;
    /**
     * The compact topbar widget declared by `manifest.topbarWidget`. Rendered
     * with NO props: everything it shows must come through YOUR feature's
     * commands, which the server authorizes against the caller's grants. The
     * host mounts it only for members whose role grants your feature.
     */
    TopbarWidget?: ComponentType;
    /**
     * Minutes the full view stays mounted (state preserved) after closing.
     * `0` = unmount immediately; omit = mounted forever.
     */
    cacheDurationMinutes?: number;
    /** Warm the full view at idle after load, when the card is placed. */
    preload?: boolean;
    /** Hold the password-encryption unlock alive while the full view is open. */
    holdSecrecy?: boolean;
    /**
     * Named contracts offered to the host's screens (see `sdk/providers.ts`),
     * the client twin of `FeatureService.providers`. The app looks a provider
     * up at render time and degrades cleanly when the module is absent.
     */
    providers?: Readonly<Record<string, unknown>>;
}

/**
 * A monitored service, as the Uptime client provider hands it to the host.
 * Deliberately a subset of the module's own contract: what a linked-service
 * block needs, and nothing the module may want to change later.
 */
export interface UptimeLinkedService {
    id: number;
    name: string;
    url: string;
    enabled: boolean;
    status: string;
    lastCheckedAt: number | null;
    ratio24h: number | null;
    ratio7d: number | null;
    ratio30d: number | null;
}

/** One bucket of a service's availability history. */
export interface UptimeHistoryPoint {
    at: number;
    checks: number;
    upChecks: number;
    avgMs: number | null;
    minMs: number | null;
    maxMs: number | null;
}

export type UptimeHistoryResolution = 'raw' | 'hour' | 'day';

/**
 * What the Devices module offers the app's own screens (`DEVICES_CLIENT_PROVIDER`):
 * the workspace's devices as a live store, the panel of one device (the home
 * renders one view per placed device), and its compact tile. Without the
 * module the home places no device and the topbar counts none.
 */
export interface DevicesClientProvider {
    /** The active workspace's devices, refreshed by the `devices` live topic. */
    useDevices(): { devices: readonly SdkDeviceSummary[]; loading: boolean; error: string | null };
    refreshDevices(): void;
    /** Forgets every loaded device (the app calls it when the session ends). */
    resetDevices(): void;
    DevicePanel: ComponentType<{ deviceId: string }>;
    DeviceWidget: ComponentType<{ deviceId: string; hideStatus?: boolean }>;
}

/** What the app's screens need of a device: identity and liveness, never the report. */
export interface SdkDeviceSummary {
    id: string;
    name: string;
    online: boolean;
    status: string;
    platform: string;
}

/**
 * What the Uptime module offers the host's screens under
 * `UPTIME_CLIENT_PROVIDER`: the availability strip, the ratios, the history
 * hook feeding the strip, the workspace's services, and the feature's own
 * service dialog.
 */
export interface UptimeClientProvider {
    /** The workspace's services, as `uptime.list` returns them. */
    listServices(): Promise<readonly UptimeLinkedService[]>;
    /**
     * A service's history for the strip. `stamp` is what re-reads it (pass
     * `service.lastCheckedAt`); no timer.
     */
    useServiceHistory(
        id: number,
        stamp: number | null
    ): {
        points: UptimeHistoryPoint[];
        resolution: UptimeHistoryResolution;
        axis: { from: number; to: number };
    };
    /** The availability strip over a window. */
    StatusBars: ComponentType<{
        points: UptimeHistoryPoint[];
        from: number;
        to: number;
        resolution: UptimeHistoryResolution;
        /** Rendered facing the legend (the ratios, typically). */
        trailing?: ReactNode;
    }>;
    /** The three-window availability ratios of a service. */
    Ratios: ComponentType<{ service: UptimeLinkedService; compact?: boolean }>;
    /** The feature's service form: `service: null` declares a new one. */
    ServiceDialog: ComponentType<{
        open: boolean;
        service: UptimeLinkedService | null;
        onClose: () => void;
        onSaved: (service: UptimeLinkedService) => void;
    }>;
}

/**
 * A database of the workspace, as the Databases client provider lists it for
 * a project's "add a database" picker. Deliberately a subset of the module's
 * own contract: what a picker shows, and nothing the module may change later.
 */
export interface DatabaseLinkedCandidate {
    id: number;
    name: string;
    /** The engine as the module labels it (« MySQL », « PostgreSQL »). */
    engineLabel: string;
    /** How many projects of the workspace already use it. */
    projectCount: number;
}

/**
 * What the Databases module offers the host's screens under
 * `DATABASE_CLIENT_PROVIDER`: the workspace's databases, a linked database
 * rendered in full inside a project's tab, and the feature's own dialog.
 */
export interface DatabaseClientProvider {
    /** The workspace's databases, as `database.list` returns them. */
    listDatabases(): Promise<readonly DatabaseLinkedCandidate[]>;
    /**
     * A database linked to a project, shown in full: header (name, address,
     * actions, its own settings button), state, alerts, table explorer. Loads
     * itself by `database.get`, follows the feature's invalidations, and
     * renders the host's "unlink" as its trailing action. Handles the
     * explorer's expanded mode on its own.
     */
    LinkedDatabase: ComponentType<{ databaseId: number; canWrite: boolean; onUnlink: () => void }>;
    /** The feature's database form, to declare a new database from a project. */
    DatabaseDialog: ComponentType<{
        open: boolean;
        onClose: () => void;
        onSaved: (databaseId: number) => void;
    }>;
}

/**
 * A deploy target of the workspace, as the Deploy client provider lists it
 * for a project's "add a target" picker.
 */
export interface DeployLinkedCandidate {
    id: number;
    name: string;
    /** The instance host, as the module labels it (« dokploy.example.com »). */
    host: string;
}

/**
 * What the Deploy module offers the host's screens under
 * `DEPLOY_CLIENT_PROVIDER`: the workspace's targets, a linked target rendered
 * in full inside a project's tab, and the feature's own dialog.
 */
export interface DeployClientProvider {
    /** The workspace's targets, as `deploy.list` returns them. */
    listTargets(): Promise<readonly DeployLinkedCandidate[]>;
    /**
     * A target linked to a project, shown in full: identity, last deployment,
     * trigger, its own settings button. Loads itself by `deploy.get`, follows
     * the feature's invalidations, and renders the host's "unlink" as its
     * trailing action. `projectId` files a trigger in that project's timeline.
     */
    LinkedTarget: ComponentType<{
        targetId: number;
        projectId: number;
        canWrite: boolean;
        onUnlink: () => void;
    }>;
    /** The feature's target form, to declare a new target from a project. */
    TargetDialog: ComponentType<{
        open: boolean;
        onClose: () => void;
        onSaved: (targetId: number) => void;
    }>;
}

/**
 * A git repository of the workspace, as the Git client provider lists it for
 * a project's "add a repository" picker.
 */
export interface GitLinkedCandidate {
    id: number;
    owner: string;
    repo: string;
}

/**
 * What the Git module offers the host's screens under `GIT_CLIENT_PROVIDER`:
 * the workspace's repositories, a linked repository rendered in full inside a
 * project's tab, and the feature's own dialog.
 */
export interface GitClientProvider {
    /** The workspace's repositories, as `git.repoList` returns them. */
    listRepos(): Promise<readonly GitLinkedCandidate[]>;
    /**
     * A repository linked to a project, shown in full: header (name, sync
     * state, actions, its own settings button), graph and panels. Loads
     * itself by `git.repoGet`, follows the feature's invalidations and the
     * sync progress, and renders the host's "unlink" as its trailing action.
     */
    LinkedRepo: ComponentType<{ repoId: number; canWrite: boolean; onUnlink: () => void }>;
    /** The feature's repository form, to declare a new repository from a project. */
    RepoDialog: ComponentType<{
        open: boolean;
        onClose: () => void;
        onSaved: (repoId: number) => void;
    }>;
}

/** A tracked site of the workspace, as the Audience client provider lists it for a project's picker. */
export interface AudienceLinkedCandidate {
    id: number;
    name: string;
}

/**
 * What the Audience module offers the host's screens under
 * `AUDIENCE_CLIENT_PROVIDER`: the workspace's sites, a linked site rendered
 * in full inside a project's tab, and the feature's own dialog.
 */
export interface AudienceClientProvider {
    /** The workspace's sites, as `audience.list` returns them. */
    listSites(): Promise<readonly AudienceLinkedCandidate[]>;
    /**
     * A site linked to a project, shown in full: its sticky heading, actions
     * (install, its own settings button), stats, funnels. Loads itself by
     * `audience.get`, follows the feature's invalidations and the live beat,
     * and renders the host's "unlink" as its trailing action.
     */
    LinkedSite: ComponentType<{ siteId: number; canWrite: boolean; onUnlink: () => void }>;
    /** The feature's site form, to declare a new site from a project. */
    SiteDialog: ComponentType<{
        open: boolean;
        onClose: () => void;
        onSaved: (siteId: number) => void;
    }>;
}

/**
 * What the Mail module offers the host's screens under `MAIL_CLIENT_PROVIDER`:
 * the ready senders (open tier, enabled) an email notification channel picks
 * from, and the feature's own account dialog.
 */
export interface MailClientProvider {
    /** The workspace's ready senders, as the module lists them. */
    listSenders(): Promise<readonly { id: number; label: string; address: string }[]>;
    /**
     * The feature's account form (manual connection or OAuth consent), to
     * declare a mailbox from the channel form. `onSaved` fires when a mailbox
     * came out of it; the host re-lists to find which.
     */
    AccountDialog: ComponentType<{ open: boolean; onClose: () => void; onSaved: () => void }>;
}
