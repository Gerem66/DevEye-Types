/**
 * Ambient declaration of `deveye-sdk-client`, the runtime barrel the APP
 * provides when a feature module is compiled in (resolved by alias inside
 * DevEye). The module itself is app code, published nowhere; this file is its
 * typed portrait, so a module repo can `tsc --noEmit` standalone (one tsconfig
 * `include` entry pointing here). DevEye verifies mechanically that the real
 * barrel honours it (`client/npm run check:sdk`): a drift breaks the app's CI,
 * never a third-party build.
 */
declare module 'deveye-sdk-client' {
    import type {
        ButtonHTMLAttributes,
        CSSProperties,
        ChangeEvent,
        ComponentType,
        InputHTMLAttributes,
        ReactNode,
        RefObject,
        SelectHTMLAttributes
    } from 'react';
    import type { z, ZodType } from 'zod';
    import type {
        ButtonHTMLAttributes as DialogButtonAttributes,
        PointerEvent as ReactPointerEvent
    } from 'react';
    import type {
        FeatureAccess,
        FeatureDomain,
        FeatureId,
        MinimalUser,
        User,
        WorkspaceCapability
    } from '@deveye/types';
    import type { FeatureManifest, ManifestCommand } from '@deveye/types/sdk';
    import type { SdkDeviceSummary } from '@deveye/types/sdk/client';

    // ── UI kit ─────────────────────────────────────────────────────────────
    export const Button: ComponentType<
        ButtonHTMLAttributes<HTMLButtonElement> & {
            variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
            icon?: string;
        }
    >;
    export const TextInput: ComponentType<
        InputHTMLAttributes<HTMLInputElement> & { enableShowHideButton?: boolean; error?: string }
    >;
    export const SelectInput: ComponentType<SelectHTMLAttributes<HTMLSelectElement>>;
    export const Checkbox: ComponentType<{
        checked: boolean;
        /** Receives the state AFTER the click — no event to unwrap. */
        onChange: (checked: boolean) => void;
        children?: ReactNode;
        disabled?: boolean;
        className?: string;
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
        /** Étire le groupe sur la ligne, chaque choix en prenant une part égale. */
        fullWidth?: boolean;
        className?: string;
        'aria-label'?: string;
        disabled?: boolean;
    }): ReactNode;
    /**
     * Le bouton d'enregistrement d'un panneau de réglages : « Enregistrement… »
     * pendant l'aller-retour, « Enregistré » quelques secondes, puis l'intitulé
     * de départ. Les erreurs restent au panneau, elles ne s'effacent pas seules.
     */
    export const SaveButton: ComponentType<{
        onSave: () => Promise<unknown> | unknown;
        children?: string;
        disabled?: boolean;
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
        icon?: string;
        title?: string;
    }>;
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
    /** The "Annuler" button of a Dialog footer: closes through the guarded close. */
    export const DialogCancelButton: ComponentType<
        DialogButtonAttributes<HTMLButtonElement> & {
            variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
            icon?: string;
        }
    >;
    /**
     * The imperative dialog layer over Dialog: mount `<Popup id=...>` once
     * around a form, then drive it with `OpenPopup(id, input)` (resolves with
     * whatever `ClosePopup(id, result)` passes, `null` on dismiss).
     */
    export function Popup<TInput = unknown>(props: {
        children: ReactNode;
        id: string;
        title?: string;
        width?: number;
        headerAction?: ReactNode;
        onInputChange?: ((input: TInput) => void) | null;
        onClosePopup?: ((id: string) => void) | null;
        onSubmit?: () => void;
        autoFocus?: boolean;
        dirty?: boolean;
        onSave?: () => void;
        tall?: boolean;
        holdSecrecy?: boolean;
    }): ReactNode;
    export function OpenPopup<T = object>(id: string, inputData?: unknown): Promise<T | null>;
    export function ClosePopup(id: string, data?: unknown): void;
    /** The app-wide "i" explainer dialog: a heading and a body, one behaviour everywhere. */
    export function openInfo(input: {
        title: string;
        body: ReactNode;
        width?: number;
    }): Promise<unknown>;
    /** Request the enclosing Dialog's guarded close (the unsaved-changes prompt included). */
    export function useDialogClose(): () => void;
    /** Register `fn` as the enclosing Dialog's primary action (Enter triggers it); `null` clears it. */
    export function useDialogSubmit(fn: (() => void) | null): void;
    /**
     * Register `onEscape` as the topmost dismissible layer while `open`, so
     * Escape closes overlays innermost first. `null` absorbs Escape without closing.
     */
    export function useDismissLayer(open: boolean, onEscape: (() => void) | null): void;
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
            | {
                  kind: 'item';
                  feature: FeatureId;
                  itemId: string;
                  itemLabel: string;
                  shareable?: boolean;
              };
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
        label?: string;
        /** The tab a click opens (one of the manifest's tab ids); the first by default. */
        initialSection?: string;
        /**
         * The shell opened or closed (unmount counts as closed): for the one
         * component that owns the item's presence (`useLiveSegment`) when
         * nothing else announces the item. The shell never declares the level.
         */
        onOpenChange?: (open: boolean) => void;
        /**
         * The item was deleted or moved to another workspace from inside the
         * shell, which has closed: the view that mounted the button leaves the
         * item (the same handler as its back button).
         */
        onGone?: () => void;
    }>;
    /**
     * One provider of a feature and the key it wants. The row carries the state
     * and the gesture; the key itself is typed in a dialog.
     */
    export interface ProviderKeyRow {
        id: string;
        label: string;
        /** What the key unlocks, or what the provider brings. */
        hint: string;
        /** A key is on file for this provider. */
        held: boolean;
        /** `false` for a provider that needs none (Open-Meteo): shown, nothing to set. */
        needsKey?: boolean;
        /** Where to get one. Only offered while no key is held. */
        signupUrl?: string;
        /** Icon class suffix, without the `icon-` prefix. */
        icon?: string;
    }
    /**
     * The `sources` tab of a feature whose providers are a fixed list, each
     * wanting one key. Renders the rows, the add/edit button on each, and the
     * dialog. `onSave` / `onRemove` reject to keep the dialog open on the error.
     */
    export const ProviderKeys: ComponentType<{
        rows: ProviderKeyRow[];
        canWrite: boolean;
        onSave: (id: string, key: string) => Promise<void>;
        onRemove: (id: string) => Promise<void>;
        /** Shown to a caller without write access. */
        readOnlyHint: string;
    }>;
    /**
     * A read-only refusal inside a settings panel: one silhouette for every
     * feature, lock glyph included. Pass the sentence as children, nothing
     * else. What blocks for another reason (an archived device, an item that
     * cannot be projected) keeps its own wording.
     */
    export const ReadOnlyNotice: ComponentType<{ children: ReactNode }>;
    /** The canonical settings row classes (channelRow, field, sectionHint...). */
    export const settingsStyles: Readonly<Record<string, string>>;
    /** A plain count on a home card: a big number, a noun, a secondary line. */
    export type CountState = { kind: 'loading' } | { kind: 'ready'; count: number };
    export const CountWidget: ComponentType<{
        state: CountState;
        /** Singular noun, pluralized with a trailing "s" unless `plural` says otherwise. */
        noun: string;
        plural?: string;
        /** Secondary line when there is at least one item. */
        hint: string;
        /** Secondary line when the count is zero. */
        empty: string;
        tone?: 'neutral' | 'danger';
    }>;
    /**
     * A workspace count over one of YOUR `.count` commands (or any `...Count`
     * command answering `{ count }`), re-fetched on reconnect and on
     * invalidation of that key. Never gated by the password-encryption unlock:
     * the command must answer while locked.
     */
    export function useWorkspaceCount(
        command: `x-${string}.count` | `${string}.${string}Count`
    ): CountState;
    /**
     * Reorder a list by drag-and-drop, the app's one gesture for it (Pointer
     * Events, a handle per row, an insertion bar the hook positions itself).
     * The list container must be `position: relative`; rows carry
     * `rowSelector`; the handle wires `onGripPointerDown`.
     */
    export function useDragReorder<
        L extends HTMLElement = HTMLElement,
        B extends HTMLElement = HTMLElement
    >(options: {
        ids: (string | number)[];
        rowSelector: string;
        onReorder: (ids: (string | number)[]) => void;
        onDragStateChange?: (dragging: boolean) => void;
        layout?: 'rows' | 'grid';
    }): {
        listRef: RefObject<L | null>;
        barRef: RefObject<B | null>;
        onGripPointerDown: (e: ReactPointerEvent, id: string | number) => void;
        draggingId: string | number | null;
    };

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
    /** The error a command rejects with: the server's code (or the socket's), its message, and the validation details when any. */
    export class WsError extends Error {
        constructor(code: string, message: string, details?: unknown);
        readonly code: string;
        readonly details?: unknown;
    }
    /**
     * The typed sender of any list of contracts (`featureApi` is it on a
     * manifest's commands). `commandsApi(agentCommands)` is how a module talks
     * to a device: the native agent transport (`agent.*`: files, terminal,
     * logs, packages, power, live metrics subscription), under the active
     * workspace's `devices` right; deferred answers arrive through
     * `onServerEvent`.
     */
    export function commandsApi<const C extends readonly ManifestCommand[]>(
        commands: C
    ): {
        send<N extends C[number]['command']>(
            name: N,
            input: z.input<Extract<C[number], { command: N }>['input'] & ZodType>,
            opts?: { timeoutMs?: number }
        ): Promise<z.output<Extract<C[number], { command: N }>['output'] & ZodType>>;
    };
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
        /** True while the session holds the unlocked key (no prompt needed). */
        unlocked: boolean;
        /** True while the unlock dialog is open. */
        prompting: boolean;
        /** Epoch ms at which the grace window expires, or null when nothing counts down. */
        unlockedUntil: number | null;
        /** "Validate on every action": the key is never cached, unlocking ahead of time is pointless. */
        alwaysPrompt: boolean;
    }
    /** Live lock state of the session (shared with the topbar widget and the global prompt). */
    export function useSecrecy(): SecrecyState;
    /** Resolves once the session is unlocked, opening the global prompt if needed. Rejects on cancel. */
    export function ensureSecrecyUnlocked(): Promise<void>;
    /** Runs `run`; on a `locked` error, opens the unlock prompt and retries once. */
    export function withSecrecy<T>(run: () => Promise<T>): Promise<T>;
    /** Keep the unlocked session alive during a long operation (a mailbox sync the user is watching). */
    export function touchSecrecy(): void;
    /**
     * The rejection of `ensureSecrecyUnlocked` / `withSecrecy` when the user
     * dismisses the unlock prompt: a deliberate cancel, not a failure (close a
     * view that has nothing to show, rather than reporting an error).
     */
    export class UnlockCancelledError extends Error {}

    // ── Live ───────────────────────────────────────────────────────────────
    export type LiveSegmentKind = 'view' | 'l1' | 'l2' | 'l3' | 'l4';
    export function useLiveSegment(
        kind: LiveSegmentKind,
        value: string | null
    ): { value: string | null } | null;
    export function useLiveOutline(kind: LiveSegmentKind, value: string | null): LiveOutlineProps;
    export function useLiveOutlines(
        kind: LiveSegmentKind
    ): (value: string | null) => LiveOutlineProps;
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
    /**
     * The workspace's enrolled devices, live: what the Devices module offers
     * the app (`DEVICES_CLIENT_PROVIDER`), refreshed by the `devices` topic.
     * Empty, loaded and without error when that module is not installed.
     */
    export function useDevices(): {
        devices: readonly SdkDeviceSummary[];
        loading: boolean;
        error: string | null;
    };
    /**
     * Acquires a live metrics subscription to a device and returns its release;
     * consumers of one socket are counted so that none unsubscribes another.
     */
    export function acquireMetrics(deviceId: string): () => void;
    /** Device paths as the agent reports them: Windows or POSIX, joined accordingly. */
    export function isWinPath(p: string): boolean;
    export function joinPath(base: string, name: string): string;
    /**
     * The DevEye version this interface was built from: what an agent's
     * reported version is compared against to offer a self-update.
     */
    export const APP_VERSION: string;
    /**
     * A validated GET on one of the app's HTTP routes (the session cookie
     * rides along; an expired access token is renewed and the call replayed
     * once). For the routes that stay HTTP because they serve binaries.
     */
    export function httpGet<T>(path: string, outputSchema?: ZodType<T>): Promise<T>;
    /** Renews the access cookie before a raw `fetch` that bypasses the client (a download). */
    export function ensureFreshAccess(): Promise<void>;
    export interface LiveOutlineProps {
        'data-live-peer'?: true;
        style?: CSSProperties;
    }

    // ── Rights and workspace ───────────────────────────────────────────────
    export function useWorkspacePermissions(): {
        isOwner: boolean;
        can: (c: WorkspaceCapability) => boolean;
        /** `itemId` répond pour CET élément, surcharge comprise. */
        canFeature: (f: FeatureId, level?: FeatureAccess, itemId?: string) => boolean;
        canChannels: (f: FeatureId) => boolean;
        canManageItemGrants: (f: FeatureId) => boolean;
        /** `itemId` répond pour CET élément, surcharge comprise. */
        canExtra: (f: FeatureId, key: string, itemId?: string) => boolean;
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
    /** The members of the active workspace, as the session lists them (empty before it answers). */
    export function useWorkspaceMembers(): readonly MinimalUser[];
    /**
     * The domains of a feature whose manifest declares `domains`, in the
     * active workspace, kept live. For a form that designates one (filter on
     * `verifiedAt !== null`); declaring and verifying happen in the Domains
     * tab, opened with `<FeatureSettingsButton initialSection='domains' />`.
     */
    export function useDomains(feature: FeatureId): {
        domains: readonly FeatureDomain[];
        loading: boolean;
        error: string | null;
    };
    /**
     * A member's identity dot: their avatar, or the default picture until they
     * upload one. `user` may be undefined: a deleted account must not break a
     * row.
     */
    export const Avatar: ComponentType<{
        user: MinimalUser | undefined;
        size?: number;
        title?: string;
    }>;
    /** The CSS variable of an account colour, the one the live presence paints with. */
    export function userColorVar(color: MinimalUser['color']): string;
    /**
     * Two sticky bands, one under the other: measure the top one and hand the
     * ancestor a `--sticky-head` variable the lower band offsets itself by.
     */
    export interface StickyOffset<T extends HTMLElement> {
        ref: RefObject<T | null>;
        style: CSSProperties;
    }
    export function useStickyOffset<T extends HTMLElement>(): StickyOffset<T>;
    /**
     * The client contract another module offers (`FeatureClient.providers`,
     * keys in `@deveye/types/sdk`): how a module composes another's screens
     * (Projects renders the linked items of Git, Uptime...). `undefined` when
     * that module is not installed: degrade, never assume.
     */
    export function moduleClientProvider<T>(key: string): T | undefined;
    /** The signed-in user, `null` before the session answers. */
    export function useCurrentUser(): User | null;
    /** Image inputs accepted by `fileToSquareDataUrl`. */
    export const ACCEPTED_TYPES: readonly string[];
    export const MAX_INPUT_BYTES: number;
    /** A picked image, resized to a square data URL under `maxLength` characters; throws a readable message. */
    export function fileToSquareDataUrl(
        file: File,
        opts: { size: number; maxLength: number }
    ): Promise<string>;
    /**
     * Open another feature of the active workspace, on one of its items when
     * `itemId` is given (the item's presence segment is its bare id): the
     * host's teleport, the same mechanism as "join someone". The access guard
     * is the host's; a missing item is ignored after a short grace.
     */
    export function openFeature(feature: string, itemId?: number | string): void;
    /**
     * Ask the feature popup for a wider frame (px) while the calling
     * component is mounted, `null` to ask for nothing. Several requests
     * coexist; the widest wins. For a view that outgrows the default width
     * (a table explorer in expanded mode).
     */
    export function useRequestPopupWidth(px: number | null): void;

    // Change events re-exported for convenience in handlers.
    export type InputChange = ChangeEvent<HTMLInputElement>;
}
