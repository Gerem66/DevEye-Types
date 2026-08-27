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

/** The scope a settings panel is opened for. */
export type SdkSettingsScope =
    { kind: 'feature' } | { kind: 'item'; itemId: number; itemLabel: string };

export interface SettingsPanelProps {
    scope: SdkSettingsScope;
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
    settingsPanels?: Readonly<Record<string, ComponentType<SettingsPanelProps>>>;
    /**
     * The compact topbar widget declared by `manifest.topbarWidget`.
     *
     * Rendered with NO props, on purpose: that is the security contract. The
     * host hands the component nothing (no user, no stores, no other feature's
     * state); everything it shows must come through YOUR feature's commands
     * (`featureApi`), which the server authorizes against the caller's grants
     * like any other call. The host also only mounts it for members whose role
     * grants your feature. Freedom inside the box, nothing outside it.
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
     * the client twin of `FeatureService.providers`: the inversion for app
     * screens that compose a module's components (Projects shows the Uptime
     * strip of a linked service). The app looks a provider up at render time
     * and degrades cleanly when the module is absent.
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
 * What the Uptime module offers the host's screens under
 * `UPTIME_CLIENT_PROVIDER`: the availability strip, the ratios, the history
 * hook feeding the strip, the list of the workspace's services, and the
 * feature's own service dialog.
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
