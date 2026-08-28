/**
 * Ambient declaration of `deveye-sdk-client` — the runtime barrel the APP
 * provides when a feature module is compiled in (resolved by alias inside
 * DevEye). The module itself is app code and is published nowhere; this file
 * is its typed portrait, so a module repo can `tsc --noEmit` standalone.
 *
 * How it is consumed:
 *  - a module repo (the template) pulls it into its standalone typecheck via
 *    one tsconfig `include` entry pointing at this file in node_modules;
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
        FeatureId,
        MinimalUser,
        User,
        WorkspaceCapability
    } from '@deveye/types';
    import type { FeatureManifest } from '@deveye/types/sdk';

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
                  itemId: number;
                  itemLabel: string;
                  shareable?: boolean;
              };
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
        label?: string;
        /** The tab a click opens (one of the manifest's tab ids); the first by default. */
        initialSection?: string;
        /**
         * The shell opened or closed (unmount counts as closed). For the one
         * component that owns the item's presence (`useLiveSegment`) when
         * nothing else announces the item, such as a card without a detail
         * pane. The shell never declares the level itself.
         */
        onOpenChange?: (open: boolean) => void;
    }>;
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
     * A workspace count over one of YOUR `.count` commands, re-fetched on
     * reconnect and on invalidation of that key. Never gated by the
     * password-encryption unlock: the command must answer while locked.
     */
    /** A `.count` command of your own, or any `...Count` command that answers `{ count }`. */
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
    /** The members of the active workspace, as the session lists them (empty before it answers). */
    export function useWorkspaceMembers(): readonly MinimalUser[];
    /**
     * A member's identity dot: their avatar, or their initial on their account
     * colour (the same one as the live presence). `user` may be undefined: a
     * deleted account must not break a row.
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
    export function openFeature(feature: string, itemId?: number): void;
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
