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
 * The scope a settings panel is opened for. An item id is text, whatever key
 * the feature's own table uses: a row-keyed feature reads it back with
 * `Number(...)`, a device is a UUID as it stands.
 */
export type SdkSettingsScope =
    { kind: 'feature' } | { kind: 'item'; itemId: string; itemLabel: string };

export interface SettingsPanelProps {
    scope: SdkSettingsScope;
    /** Caller has `write` on the feature. Render read-only when false. */
    canWrite: boolean;
    /**
     * Closes the settings dialog, nothing more. For a gesture best followed on
     * the screen underneath (a full resync whose progress the item's view
     * draws). Not a substitute for saving: every other change applies in place.
     */
    close(): void;
    /**
     * The item being configured no longer exists here (deleted, moved to
     * another workspace): the shell closes, then the view that opened it
     * leaves the item. The scope it was opened on is gone, and the shell would
     * otherwise fall back to the feature's own tabs under the item's name.
     */
    gone(): void;
}

export interface FeatureViewProps {
    /** Closes the full view (the popup over the grid). */
    closeFeature(): void;
}

/** Props of {@link FeatureClient.AccountView}. */
export interface AccountViewProps {
    close(): void;
    /** The viewer is a global administrator of this DevEye. */
    isAdmin: boolean;
    /** The hint a sign-up carried (`manifest.accountEntry.signupHint`), delivered once. */
    hint?: string;
}

/** Props of {@link FeatureClient.AdminView}. */
export interface AdminViewProps {
    close(): void;
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
    Widget?: ComponentType;
    /** The full view, opened when the card expands. Required with `Widget` unless `manifest.accountOnly`. */
    Full?: ComponentType<FeatureViewProps>;
    /** The view `manifest.accountEntry` opens from the user menu. */
    AccountView?: ComponentType<AccountViewProps>;
    /** The system page `manifest.adminEntry` opens, for a global administrator only. */
    AdminView?: ComponentType<AdminViewProps>;
    /**
     * The vignette shown on your card in the home grid's add market and on
     * your "About" sheet. Without one, the host draws a neutral module mark:
     * a card with no vignette among cards that have one reads as broken.
     *
     * Return SVG CHILDREN, not an `<svg>`: the host supplies the frame, a
     * 160 x 90 viewBox with the useful area at x 16 to 144 centred on y 45, so
     * every vignette shares one set of margins. Colour with the theme's CSS
     * variables (`var(--accent)`, `var(--text-muted)`), never a literal: an
     * accent colour is per-workspace, and a hardcoded one ignores the theme.
     * Draw the SHAPE of your screen, not your icon enlarged.
     */
    Art?: ComponentType;
    /**
     * Panels for the manifest's settings tabs that need one: `'general'`,
     * `'sources'`, `'encryption'`, and any custom tab id. Generic tabs
     * (`'notifications'`, `'permissions'`) need no panel.
     */
    settingsPanels?: Readonly<Record<string, ComponentType<SettingsPanelProps>>>;
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
/**
 * One figure of a project's dashboard tile. The module formats it, the host only
 * places it: neither has to know the other's vocabulary.
 */
export interface SdkTileMetric {
    /** Stable key of the figure inside its tile, so the host never orders by accident. */
    key: string;
    label: string;
    /** Already formatted by the module (« 1 240 », « 99,95 % », « il y a 3 h »). */
    value: string;
    /** What the theme must say of this value. Never a colour. */
    tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'bad';
}

/**
 * What a module answers about ONE of its items, for a dashboard tile. Always one
 * entry per id asked for, so the host never has to guess which one is missing.
 */
export interface SdkTileSummary {
    itemId: number;
    /** The item's name; the host makes it the tile's heading. */
    title: string;
    /** Two or three figures, never more: a tile is not a screen. */
    metrics: readonly SdkTileMetric[];
    /**
     * Why it cannot be measured, in one sentence (item gone, token revoked,
     * monitoring off). The host shows it inside the tile and does NOT turn it
     * into a screen error: a dashboard shows what it can.
     */
    unavailable?: string;
}

export interface UptimeLinkedService {
    id: number;
    name: string;
    url: string;
    enabled: boolean;
    /** Its owner's plan holds it paused: nothing is measured until the limit rises. */
    planPaused: boolean;
    /** Projected here from another workspace. */
    foreign?: boolean;
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
 * the workspace's devices as a live store, and the compact tile of one of them.
 * Without the module the home places no device and the topbar counts none.
 */
export interface DevicesClientProvider {
    /** The active workspace's devices, refreshed by the `devices` live topic. */
    useDevices(): { devices: readonly SdkDeviceSummary[]; loading: boolean; error: string | null };
    refreshDevices(): void;
    /** Forgets every loaded device (the app calls it when the session ends). */
    resetDevices(): void;
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
     * The given services, summarised for a project's dashboard tile. ONE round
     * trip whatever their number: a dashboard that opened one per tile would
     * cost far more than the figures are worth. An id the caller cannot read,
     * or that is gone, comes back `unavailable`, never as a throw.
     */
    summarize(serviceIds: readonly number[]): Promise<readonly SdkTileSummary[]>;
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
    /** The feature's service form, to declare a new service from a project. */
    ServiceDialog: ComponentType<{
        open: boolean;
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
    /** Projected here from another workspace. */
    foreign?: boolean;
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
     * The given databases, summarised for a project's dashboard tile. ONE round
     * trip whatever their number: a dashboard that opened one per tile would
     * cost far more than the figures are worth. An id the caller cannot read,
     * or that is gone, comes back `unavailable`, never as a throw.
     */
    summarize(databaseIds: readonly number[]): Promise<readonly SdkTileSummary[]>;
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
    /** Projected here from another workspace. */
    foreign?: boolean;
    /** Where the target lives, as the module labels it (« dokploy.example.com », « github.com/owner/repo »). */
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
     * The given targets, summarised for a project's dashboard tile. ONE round
     * trip whatever their number: a dashboard that opened one per tile would
     * cost far more than the figures are worth. An id the caller cannot read,
     * or that is gone, comes back `unavailable`, never as a throw.
     */
    summarize(targetIds: readonly number[]): Promise<readonly SdkTileSummary[]>;
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
    /** Projected here from another workspace. */
    foreign?: boolean;
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
     * The given repositories, summarised for a project's dashboard tile. ONE round
     * trip whatever their number: a dashboard that opened one per tile would
     * cost far more than the figures are worth. An id the caller cannot read,
     * or that is gone, comes back `unavailable`, never as a throw.
     */
    summarize(repoIds: readonly number[]): Promise<readonly SdkTileSummary[]>;
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
    /** Projected here from another workspace. */
    foreign?: boolean;
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
     * The given sites, summarised for a project's dashboard tile. ONE round
     * trip whatever their number: a dashboard that opened one per tile would
     * cost far more than the figures are worth. An id the caller cannot read,
     * or that is gone, comes back `unavailable`, never as a throw.
     */
    summarize(siteIds: readonly number[]): Promise<readonly SdkTileSummary[]>;
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

/** A folder of the workspace, as the Hosting client provider lists it for a project's picker. */
export interface HostingLinkedCandidate {
    id: number;
    name: string;
    /** Projected here from another workspace. */
    foreign?: boolean;
}

/**
 * What the Hosting module offers the host's screens under
 * `HOSTING_CLIENT_PROVIDER`: the workspace's folders, a linked folder shown
 * inside a project's tab, and the feature's own folder dialog.
 */
export interface HostingClientProvider {
    /** The workspace's folders, in the module's own order. */
    listPacks(): Promise<readonly HostingLinkedCandidate[]>;
    /**
     * The given folders, summarised for a project's dashboard tile, in ONE
     * round trip. An id the caller cannot read, or that is gone, comes back
     * `unavailable`, never as a throw.
     */
    summarize(packIds: readonly number[]): Promise<readonly SdkTileSummary[]>;
    /**
     * A folder linked to a project: its heading and status, its addresses,
     * its latest files with their preview. Loads itself, follows the
     * feature's invalidations, and renders the host's "unlink" as its
     * trailing action.
     */
    LinkedPack: ComponentType<{ packId: number; canWrite: boolean; onUnlink: () => void }>;
    /** The feature's folder form, to create a folder from a project. */
    PackDialog: ComponentType<{
        open: boolean;
        onClose: () => void;
        onSaved: (packId: number) => void;
    }>;
}

/**
 * What the Invoicing module offers other screens under
 * `INVOICING_CLIENT_PROVIDER`. It sends Invoicing's own command under the
 * caller's session: the same rights, audit and "invoice settled" notice as a
 * payment typed in Invoicing.
 */
export interface InvoicingClientProvider {
    /** Records a bank transfer received on this invoice. Rejects as the command does (rights, overpayment). */
    recordPayment(input: {
        docId: number;
        paidOn: string;
        amountCents: number;
        reference: string;
    }): Promise<void>;
}

/**
 * What the Mail module offers the host's screens under `MAIL_CLIENT_PROVIDER`:
 * the ready senders (open tier, enabled) an email notification channel picks
 * from, and the feature's own account dialog.
 */
/** What a caller already knows of the mailbox it sends to Mail's account form. */
export interface MailAccountPrefill {
    displayName: string;
    emailAddress: string;
    imap: { host: string; port: number; username: string; password: string };
    smtp: { host: string; port: number; username: string; password: string };
}

export interface MailClientProvider {
    /** The workspace's ready senders, as the module lists them. */
    listSenders(): Promise<readonly { id: number; label: string; address: string }[]>;
    /**
     * The account holding this address among those the caller can read, or
     * null. A guarded account of a locked session does not show its address:
     * it reads as absent.
     */
    findByAddress(address: string): Promise<{ id: number } | null>;
    /**
     * The feature's account form (manual connection or OAuth consent), to
     * declare a mailbox from the channel form. `onSaved` fires when a mailbox
     * came out of it; the host re-lists to find which. With `prefill`, the
     * form opens on the manual connection, filled in and ready to save.
     */
    AccountDialog: ComponentType<{
        open: boolean;
        onClose: () => void;
        onSaved: () => void;
        prefill?: MailAccountPrefill;
    }>;
}
