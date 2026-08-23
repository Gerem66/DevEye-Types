/**
 * Ambient declaration of `deveye-sdk-client` — the runtime barrel the APP
 * provides when a feature module is compiled in (resolved by alias inside
 * DevEye). The module itself is app code and is published nowhere; this file
 * is its typed portrait, so a module repo can `tsc --noEmit` standalone.
 *
 * How it is consumed:
 *  - a module repo (the template) references this file from its own stub
 *    (`types/deveye-sdk-client.d.ts`, a one-line triple-slash reference);
 *  - DevEye itself verifies MECHANICALLY that the real barrel honours this
 *    declaration (`client/npm run check:sdk`): a drift breaks the app's CI,
 *    never a third-party build.
 *
 * Extend it when the app's stable surface grows — same gesture as before,
 * one file instead of one per module repo.
 */
declare module 'deveye-sdk-client' {
    import type {
        ButtonHTMLAttributes,
        ChangeEvent,
        ComponentType,
        CSSProperties,
        InputHTMLAttributes,
        ReactNode,
        SelectHTMLAttributes
    } from 'react';
    import type { z, ZodType } from 'zod';
    import type { FeatureAccess, FeatureId, WorkspaceCapability } from 'deveye-types';
    import type { FeatureManifest } from 'deveye-types/sdk';

    // ── UI kit ─────────────────────────────────────────────────────────────
    export const Button: ComponentType<
        ButtonHTMLAttributes<HTMLButtonElement> & {
            variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
            icon?: string;
        }
    >;
    export const TextInput: ComponentType<
        InputHTMLAttributes<HTMLInputElement> & { enableShowHideButton?: boolean }
    >;
    export const SelectInput: ComponentType<SelectHTMLAttributes<HTMLSelectElement>>;
    export const Checkbox: ComponentType<{
        checked: boolean;
        /** Receives the state AFTER the click — no event to unwrap. */
        onChange: (checked: boolean) => void;
        children?: ReactNode;
        disabled?: boolean;
        /** Required when there is no visible label. */
        'aria-label'?: string;
    }>;
    export const Switch: ComponentType<{
        checked: boolean;
        onChange: (checked: boolean) => void;
        label?: string;
        hint?: string;
        disabled?: boolean;
        'aria-label'?: string;
    }>;
    export function SegmentedControl<T extends string>(props: {
        value: T;
        options: readonly { value: T; label: string; title?: string }[];
        onChange: (value: T) => void;
        className?: string;
        'aria-label'?: string;
        disabled?: boolean;
    }): ReactNode;
    export const Dialog: ComponentType<{
        open: boolean;
        onClose: () => void;
        title?: string;
        description?: ReactNode;
        children?: ReactNode;
        footer?: ReactNode;
        /** Extra action in the top-right corner, left of the close button. */
        headerAction?: ReactNode;
        width?: number;
        onSubmit?: () => void;
        fill?: boolean;
        holdSecrecy?: boolean;
    }>;
    export const StatusBadge: ComponentType<{
        tone?: 'online' | 'offline' | 'success' | 'warning' | 'danger' | 'accent' | 'neutral';
        /** Show the leading status dot (default true). */
        dot?: boolean;
        children: ReactNode;
        className?: string;
    }>;
    /** One confirmation dialog for the whole app — see ConfirmDialog. */
    export interface ConfirmRequest {
        title: string;
        description?: ReactNode;
        confirmLabel?: string;
        /** `primary` for a reversible action; `danger` (default) otherwise. */
        tone?: 'danger' | 'primary';
        onConfirm: () => void;
    }
    export const ConfirmDialog: ComponentType<{
        /** The pending request, or `null` when nothing awaits confirmation. */
        request: ConfirmRequest | null;
        onClose: () => void;
        busy?: boolean;
    }>;
    export const FeatureSettingsButton: ComponentType<{
        scope:
            | { kind: 'feature'; feature: FeatureId }
            | { kind: 'item'; feature: FeatureId; itemId: number; itemLabel: string };
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
        label?: string;
    }>;
    /** The canonical settings row classes (channelRow, field, sectionHint...). */
    export const settingsStyles: Readonly<Record<string, string>>;

    // ── Server push events ─────────────────────────────────────────────────
    /** Typed push subscription: filters `event`, safeParses, drops mismatches. */
    export function onServerEvent<T>(
        event: string,
        schema: ZodType<T>,
        cb: (payload: T) => void
    ): () => void;
    /** Fires now if the socket is open, then on every reopen (resubscribe primitive). */
    export function onSocketOpen(cb: () => void): () => void;
    /** Whether the socket is open right now (to tell a real error from an outage). */
    export function isSocketOpen(): boolean;

    // ── Data ───────────────────────────────────────────────────────────────
    /**
     * A resource key an EXTERNAL module may own: `x-<slug>.<name>`, as listed
     * in its manifest `resources`. The app's bus is typed on the closed union
     * of native keys plus this shape — an arbitrary string is refused there,
     * so it is refused here too.
     */
    export type ExternalResourceKey = `x-${string}.${string}`;
    export function useResource<T>(
        key: ExternalResourceKey,
        load: () => Promise<T>,
        fallback: string,
        deps?: readonly unknown[]
    ): { data: T | null; error: string | null; loading: boolean; reload: () => void };
    export function invalidate(...keys: ExternalResourceKey[]): void;
    export function useResourceVersion(key: ExternalResourceKey): number;
    /** Imperative subscription to one resource key's invalidations. Returns the unsubscribe. */
    export function onResourceChange(key: ExternalResourceKey, cb: () => void): () => void;
    export function humanizeError(error: unknown, fallback: string): string;
    export function featureApi<const M extends FeatureManifest>(
        manifest: M
    ): {
        send<N extends M['commands'][number]['command']>(
            name: N,
            input: z.input<Extract<M['commands'][number], { command: N }>['input'] & ZodType>,
            /** `timeoutMs` stretches the wait for a command that queries a slow third party. */
            opts?: { timeoutMs?: number }
        ): Promise<z.output<Extract<M['commands'][number], { command: N }>['output'] & ZodType>>;
    };

    // ── Password-based encryption (secrecy) ────────────────────────────────
    // The surface any feature needs when one of its commands can answer
    // `locked` (contracts stored with `'private'` encryption server-side).
    export interface SecrecyState {
        /** True when password-based encryption is enabled for the account. */
        enabled: boolean;
        /** True while the session holds the unlocked key. */
        unlocked: boolean;
    }
    /** Live lock state of the session (shared with the topbar widget and the global prompt). */
    export function useSecrecy(): SecrecyState;
    /** Resolves once the session is unlocked, opening the global prompt if needed. Rejects on cancel. */
    export function ensureSecrecyUnlocked(): Promise<void>;
    /** Runs `run`; on a `locked` error, opens the unlock prompt and retries once. */
    export function withSecrecy<T>(run: () => Promise<T>): Promise<T>;

    // ── Live ───────────────────────────────────────────────────────────────
    export type LiveSegmentKind = 'view' | 'l1' | 'l2' | 'l3' | 'l4';
    export function useLiveSegment(
        kind: LiveSegmentKind,
        value: string | null
    ): { value: string | null } | null;
    export function useLiveOutline(kind: LiveSegmentKind, value: string | null): LiveOutlineProps;
    export function useLiveOutlines(kind: LiveSegmentKind): (value: string | null) => LiveOutlineProps;
    export function useLiveItemTarget(
        kind: LiveSegmentKind,
        value: string | null,
        ready: boolean,
        onTarget: (value: string | null) => void
    ): void;
    export function useTypers(): { connId: string; userId: number }[];
    export function useTypingSignal(): { onInput: () => void; stop: () => void };

    // ── Shared helpers ─────────────────────────────────────────────────────
    /** Byte size with French units (o / Ko / Mo / Go). */
    export function formatBytesFr(bytes: number): string;
    /** Folder picker over an enrolled device's filesystem (shared with Backup). */
    export const DeviceFolderPicker: ComponentType<{
        open: boolean;
        deviceId: string;
        deviceName: string;
        onClose: () => void;
        /** Called with the absolute path of the folder picked on the device. */
        onPick: (path: string) => void;
        /** What the folder is for, said by the caller. */
        description?: string;
    }>;
    /** The workspace's enrolled devices, live (a polled store, not a bare list). */
    export function useDevices(): {
        devices: { id: string; name: string; online: boolean }[];
        loading: boolean;
        error: string | null;
        refresh: () => Promise<void>;
    };
    export interface LiveOutlineProps {
        'data-live-peer'?: true;
        style?: CSSProperties;
    }

    // ── Rights and workspace ───────────────────────────────────────────────
    export function useWorkspacePermissions(): {
        isOwner: boolean;
        can: (c: WorkspaceCapability) => boolean;
        canFeature: (f: FeatureId, level?: FeatureAccess) => boolean;
        canChannels: (f: FeatureId) => boolean;
        canExtra: (f: FeatureId, key: string) => boolean;
        extraValue: (
            f: FeatureId,
            key: string,
            spec: { default: string; ownerValue: string }
        ) => string;
    };
    export function useActiveWorkspace(): {
        id: number;
        kind: 'personal' | 'shared';
        name: string;
    } | null;
    export function useFeatureLifecycle(hooks: { onUnmount?: () => void }): void;

    // Change events re-exported for convenience in handlers.
    export type InputChange = ChangeEvent<HTMLInputElement>;
}
