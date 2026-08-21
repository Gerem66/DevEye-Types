import type { ComponentType } from 'react';

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
     * `'sources'`, and any custom tab id. Generic tabs (`'notifications'`,
     * `'permissions'`) need no panel.
     */
    settingsPanels?: Readonly<Record<string, ComponentType<SettingsPanelProps>>>;
    /**
     * Minutes the full view stays mounted (state preserved) after closing.
     * `0` = unmount immediately; omit = mounted forever.
     */
    cacheDurationMinutes?: number;
    /** Warm the full view at idle after load, when the card is placed. */
    preload?: boolean;
    /** Hold the password-encryption unlock alive while the full view is open. */
    holdSecrecy?: boolean;
}
