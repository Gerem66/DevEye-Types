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
        DragEvent,
        InputHTMLAttributes,
        ReactNode,
        RefObject
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
        PathExclusionKind,
        RequestProgress,
        User,
        WorkspaceCapability
    } from '@deveye/types';
    import type {
        AccountPlan,
        DeviceRelayOption,
        FeatureManifest,
        ManifestCommand,
        PageTheme,
        PageThemeChoice
    } from '@deveye/types/sdk';
    import type { SdkDeviceSummary } from '@deveye/types/sdk/client';

    // ── UI kit ─────────────────────────────────────────────────────────────
    export const Button: ComponentType<
        ButtonHTMLAttributes<HTMLButtonElement> & {
            variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
            icon?: string;
        }
    >;
    export const TextInput: ComponentType<
        InputHTMLAttributes<HTMLInputElement> & {
            enableShowHideButton?: boolean;
            error?: string;
            /**
             * Shows a clear button inside the field while it holds a value. On a date or time
             * field it shows on touch screens only: desktop browsers draw their own.
             */
            onClear?: () => void;
        }
    >;
    export interface ActionMenuItem {
        label: string;
        icon?: string;
        onSelect: () => void;
        /** A destructive action: shown in red. */
        danger?: boolean;
        disabled?: boolean;
        /** What the action does, in one sentence, under the label. */
        detail?: string;
    }
    export interface ActionMenuProps {
        items: readonly ActionMenuItem[];
        /** The button's name, for screen readers and the tooltip. */
        label?: string;
        className?: string;
        /** The button's content in place of "⋯": the round look goes, `className` draws it. */
        trigger?: ReactNode;
    }
    /** A "⋯" button that unfolds secondary actions above everything, never clipped by a scrolling parent. */
    export const ActionMenu: ComponentType<ActionMenuProps>;
    export interface CopyButtonProps {
        value: string;
        /** What gets copied, for the tooltip and screen readers ("Copier la clé"). */
        label?: string;
        className?: string;
    }
    /** Copies `value` to the clipboard and confirms through its icon for two seconds; a refused clipboard stays silent. */
    export const CopyButton: ComponentType<CopyButtonProps>;
    export interface LoadingVeilProps {
        /** Read by screen readers, and shown under the spinner when given. */
        label?: string;
        /** `top` for a long scrolling area: the spinner stays in view. */
        align?: 'center' | 'top';
        /** Appears after a quarter of a second: a brief read never flickers. */
        delayed?: boolean;
        className?: string;
    }
    /**
     * The veil of a re-read: a layer over an area, the previous content legible
     * underneath, taking no click and no scroll. Mount it as a SIBLING of the
     * scrolling area inside a `position: relative` parent (inside an
     * `overflow: auto` it would scroll away). Dim what it covers with
     * `filter: opacity()`, never `opacity`.
     */
    export const LoadingVeil: ComponentType<LoadingVeilProps>;
    export interface ProgressBarProps {
        /** From 0 to 1 when the progress is measured; absent, the bar sweeps without promising anything. */
        value?: number;
        /** Read by screen readers. */
        label: string;
        className?: string;
    }
    export const ProgressBar: ComponentType<ProgressBarProps>;
    export interface ProgressDialogProps {
        open: boolean;
        title: string;
        /** What is being done, and why it is worth the wait. */
        description?: string;
        /** See {@link ProgressBarProps.value}. */
        value?: number;
        /** The current step, under the bar. */
        step?: string;
    }
    /**
     * A long operation under way: a dialog nothing closes while it lasts, and
     * a bar. Its owner closes it (`open: false`) when the operation ends or
     * gives up.
     */
    export const ProgressDialog: ComponentType<ProgressDialogProps>;
    export interface LogOutputProps {
        /** The raw log, ANSI sequences included: the component cleans it. */
        text: string;
        /** A read in progress: the veil, over whatever is already shown. */
        busy?: boolean;
        /** Search, count and copy above the lines. Default `true`. */
        toolbar?: boolean;
        /** What reads when the log is empty. */
        emptyText?: string;
        /** Stays at the bottom when text arrives and the reader was there. Default `true`. */
        follow?: boolean;
        /** Caps the body's height outside a flex column (a block inside a sheet). */
        maxHeight?: number;
        className?: string;
        'aria-label'?: string;
    }
    /**
     * A readable raw log: the output of a provider or a tool, cleaned of ANSI
     * codes and coloured by what each line says (step, error, warning,
     * success), timestamps and durations set back. The toolbar filters lines
     * and copies what is shown. Inside a flex column (a `Dialog tall`) it
     * takes the remaining room.
     */
    export const LogOutput: ComponentType<LogOutputProps>;
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
    /**
     * The app's number field: a native number input between two ± buttons.
     * `null` is an empty field. What is being typed is never rewritten while
     * the field has focus; the value is clamped to `min`/`max` on blur. `live`
     * reports every in-range keystroke, for what shows at once (a preview).
     * On the focused field only, the wheel steps by `step`, by fifty steps with
     * Ctrl or Shift held; anywhere else it scrolls the page.
     */
    export const NumberInput: ComponentType<{
        value: number | null;
        onChange: (value: number | null) => void;
        min?: number;
        max?: number;
        step?: number;
        placeholder?: string;
        disabled?: boolean;
        live?: boolean;
        /** For a wrapping `<label htmlFor>`: without it, clicking the label would press "−". */
        id?: string;
        'aria-label'?: string;
        className?: string;
    }>;
    /**
     * One choice of a `SearchSelect`. `prefix` is decorative (a flag, an avatar);
     * `keywords` widen what the search reads. Options sharing a `group` are
     * listed together under that heading, groups in order of first appearance.
     * A `disabled` option is shown but cannot be picked: say why in `detail`.
     */
    export interface SearchSelectOption<T extends string = string> {
        value: T;
        label: string;
        prefix?: ReactNode;
        detail?: string;
        keywords?: readonly string[];
        group?: string;
        disabled?: boolean;
    }
    /** A chip under the search field that keeps only the options passing `test`. */
    export interface SearchSelectFilter<T extends string = string> {
        value: string;
        label: string;
        test: (option: SearchSelectOption<T>) => boolean;
        /** Chips sharing a key exclude each other: activating one releases the others. */
        exclusive?: string;
    }
    interface SearchSelectCommonProps<T extends string> {
        options: readonly SearchSelectOption<T>[];
        'aria-label': string;
        /** What the trigger shows when no option carries the current value. */
        placeholder?: string;
        searchPlaceholder?: string;
        emptyText?: string;
        /** The search field: `'auto'` (default) shows it from eight choices on. */
        searchable?: boolean | 'auto';
        /** Chips under the search, AND-combined, reset when the panel closes. */
        filters?: readonly SearchSelectFilter<T>[];
        /** The trigger's id, for a label's `htmlFor`. */
        id?: string;
        /** The field the opening Dialog focuses first (`data-autofocus`). */
        autoFocus?: boolean;
        disabled?: boolean;
        className?: string;
    }
    /**
     * The app's dropdown. The search field (accent- and case-insensitive, group
     * names included) only appears from eight choices on, or on request; filter
     * chips can narrow the list. Safe inside a Dialog: the panel is portaled.
     * With `multiple`, each option is a check box: picking one toggles it and
     * keeps the panel open.
     */
    export function SearchSelect<T extends string>(
        props: SearchSelectCommonProps<T> & {
            multiple?: false;
            value: T;
            onChange: (value: T) => void;
        }
    ): ReactNode;
    export function SearchSelect<T extends string>(
        props: SearchSelectCommonProps<T> & {
            multiple: true;
            value: readonly T[];
            onChange: (value: T[]) => void;
        }
    ): ReactNode;
    /**
     * A labelled range input. `valueLabel` is how the value reads ("24", "80 %");
     * `marks` sit under the track; `indicator` draws a discreet tick at a
     * reference value (decorative: say what it means in `hint`).
     */
    export const Slider: ComponentType<{
        value: number;
        onChange: (value: number) => void;
        min: number;
        max: number;
        step?: number;
        label: string;
        valueLabel?: string;
        marks?: readonly string[];
        indicator?: number;
        hint?: string;
        disabled?: boolean;
        className?: string;
    }>;
    export function SegmentedControl<T extends string>(props: {
        value: T;
        /** `detail`: a small line under the label, what the choice amounts to here ("Original", then "30 fps"). */
        options: readonly { value: T; label: string; title?: string; detail?: string }[];
        onChange: (value: T) => void;
        /** Étire le groupe sur la ligne, chaque choix en prenant une part égale. */
        fullWidth?: boolean;
        className?: string;
        'aria-label'?: string;
        disabled?: boolean;
    }): ReactNode;
    /**
     * A single choice where each option explains itself: one card per option,
     * label and consequences together. For two or three choices that commit
     * the user; a harmless setting stays a `SegmentedControl`. A description
     * may hold its own clickable elements without checking the card.
     */
    export function ChoiceCards<T extends string>(props: {
        value: T;
        options: readonly {
            value: T;
            label: string;
            description: ReactNode;
            /** Icon class (`icon-lock`...), shown next to the label. */
            icon?: string;
            /** Why the option is not offered: makes it inert, shown under the description. */
            unavailable?: ReactNode;
        }[];
        onChange: (value: T) => void;
        disabled?: boolean;
        /** The choice being applied: its card says so, the others wait. */
        pending?: T | null;
        /** A pointer click on a card, the current choice included: for a choice that advances a step. */
        onPick?: (value: T) => void;
        'aria-label'?: string;
    }): ReactNode;
    /** One choice of a `CountBadge`: what it counts, and whether it asks to be seen. */
    export interface CountBadgeProps {
        count: number;
        /** `accent` (default): unread, something to act on. `neutral`: a plain count. */
        tone?: 'accent' | 'neutral';
        /** Above it, the badge reads "99+". Default 99. */
        max?: number;
        /** Needed when the number alone does not say what it counts. */
        'aria-label'?: string;
        className?: string;
    }
    /**
     * A counter pill: a number in a round. Round on one digit, a capsule beyond,
     * its content centred both ways, which plain padding does not give.
     */
    export const CountBadge: ComponentType<CountBadgeProps>;
    /**
     * The save button of a settings panel: "Saving…" during the round trip,
     * "Saved" for a few seconds, then its label again. Errors stay in the panel;
     * they do not clear on their own.
     *
     * Its place follows what it saves. `placement: 'footer'` (default) pins it
     * to the bottom right of the settings dialog, outside what scrolls: for a
     * button that saves the whole tab. `'inline'` leaves it where it is written:
     * for a button that saves one block or one entry of a list. Outside a
     * settings dialog, both render inline.
     */
    export const SaveButton: ComponentType<{
        onSave: () => Promise<unknown> | unknown;
        children?: string;
        disabled?: boolean;
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
        icon?: string;
        title?: string;
        placement?: 'footer' | 'inline';
    }>;
    export const Dialog: ComponentType<{
        open: boolean;
        onClose: () => void;
        title?: string;
        /** A small line above the title: where this dialog sits. */
        kicker?: ReactNode;
        description?: ReactNode;
        children?: ReactNode;
        footer?: ReactNode;
        /** Extra action in the top-right corner, left of the close button. */
        headerAction?: ReactNode;
        width?: number;
        /** When false, overlay click and Escape no longer close the dialog. Default true. */
        dismissible?: boolean;
        onSubmit?: () => void;
        /** Move focus to the first field on open. Default true. */
        autoFocus?: boolean;
        /** Unsaved changes: closing first asks; requires `onSave`. */
        dirty?: boolean;
        onSave?: () => void;
        /** A viewport-tall flex column: title and footer pinned, the body scrolls. */
        tall?: boolean;
        /** The height follows the content up to the viewport, then the body scrolls. */
        fill?: boolean;
        holdSecrecy?: boolean;
        /** Without the close button (a progress dialog). Default true. */
        closeButton?: boolean;
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
    /** The technical terms the app's glossary defines. */
    export type GlossaryTermId =
        'zeroKnowledge' | 'encryption' | 'twoFactor' | 'webhook' | 'imap' | 'smtp' | 'proxy';
    /**
     * A technical term inside a sentence: reads like the surrounding text and
     * opens its plain-language definition on click. `children` is the term as
     * the sentence spells it; it defaults to the definition's title.
     */
    export function Term(props: { id: GlossaryTermId; children?: ReactNode }): ReactNode;
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
    /**
     * Points at the settings button of `scope` for about a second: the gesture
     * that follows an action taken OUTSIDE the settings (a banner that puts a
     * page back online), so the user learns where that setting lives. Only the
     * canonical button answers, the one mounted without `initialSection`:
     * shortcuts to a given tab share the scope and would all light up. Does
     * nothing when no such button is on screen. Honors `prefers-reduced-motion`
     * with a still outline.
     */
    export function flashSettings(
        scope:
            | { kind: 'feature'; feature: FeatureId }
            | { kind: 'item'; feature: FeatureId; itemId: string }
    ): void;
    export const FeatureSettingsButton: ComponentType<{
        scope:
            | { kind: 'feature'; feature: FeatureId }
            | {
                  kind: 'item';
                  feature: FeatureId;
                  itemId: string;
                  itemLabel: string;
                  shareable?: boolean;
              }
            | {
                  /** A record (`manifest.settings.record`): a row with its own sheet that is not an item. */
                  kind: 'record';
                  feature: FeatureId;
                  recordId: string;
                  recordLabel: string;
                  /** The sentence under the title: what these settings act on. */
                  description: string;
              };
        /**
         * `link` renders an underlined word instead of a button, for the gesture
         * dropped into a sentence or into a cell too narrow for a button: same
         * door, same dialog, another skin.
         */
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
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
        /**
         * Whether a key is wanted. `false` for a provider that needs none
         * (Open-Meteo): shown, nothing to set. `'optional'` when the row works
         * without one and a key only enriches it. Required by default.
         */
        needsKey?: boolean | 'optional';
        /** Where to get one. Only offered while no key is held. */
        signupUrl?: string;
        /** Icon class suffix, without the `icon-` prefix. */
        icon?: string;
        /** Who issues the key, when the row bears another name. Defaults to `label`. */
        issuer?: string;
        /** What the key changes, heading the dialog. Defaults to `hint`. */
        keyHint?: string;
        /** Pills after the name: a price tier, a scope. */
        badges?: { label: string; tone?: 'neutral' | 'accent' | 'warning' }[];
        /** Consecutive rows of the same group share a heading. */
        group?: string;
    }
    /**
     * A fixed list of providers, each wanting one key (or none): the rows, the
     * add/edit button on each, and the dialog. `onSave` / `onRemove` reject to
     * keep the dialog open on the error.
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
    export interface ErrorNoteInput {
        message: string;
        code: string | null;
    }
    export interface ErrorNoteProps {
        note: ErrorNoteInput | null;
        children?: ReactNode;
    }
    /**
     * A refusal banner: the sentence, the caller's own repair actions as
     * children, and a report button when the failure is not one the user can
     * fix on their own.
     */
    export const ErrorNote: ComponentType<ErrorNoteProps>;
    /** Open the report form, primed with what failed. */
    export function openReport(context?: string | null): void;
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

    // ── Files ──────────────────────────────────────────────────────────────
    /** A file picked or dropped, with its relative path, name included (`photos/a.jpg`; `a.jpg` outside a folder). */
    export interface PickedFile {
        file: File;
        path: string;
    }
    export interface UploadHandle {
        done: Promise<void>;
        abort(): void;
    }
    /** What `UploadHandle.done` rejects with: the server's message, or why the connection ended. */
    export class UploadError extends Error {
        readonly aborted: boolean;
        constructor(message: string, aborted?: boolean);
    }
    /**
     * POSTs the file as is (`application/octet-stream`) to a route of yours,
     * typically a `postStream` URL carrying a ticket. `onProgress` gets 0 to 1;
     * at 1 the server is still writing.
     */
    export function uploadFile(
        url: string,
        file: File,
        onProgress: (ratio: number) => void
    ): UploadHandle;
    /** Downloads a URL served as an attachment, without leaving the page. */
    export function saveFrom(url: string): void;
    /** Opens the system picker; `folder` takes a whole folder, relative paths included. Cancelled: empty. */
    export function pickFiles(opts?: {
        multiple?: boolean;
        folder?: boolean;
        accept?: string;
    }): Promise<PickedFile[]>;
    /** Reads a drop: its files and, recursively, the content of the folders dropped. */
    export function filesOfDrop(data: DataTransfer): Promise<PickedFile[]>;
    /** Makes any element a drop target: spread `props` on it, `over` while files hover. */
    export function useFileDrop(
        onFiles: (files: PickedFile[]) => void,
        disabled?: boolean
    ): {
        over: boolean;
        props: {
            onDragOver: (event: DragEvent) => void;
            onDragLeave: (event: DragEvent) => void;
            onDrop: (event: DragEvent) => void;
        };
    };
    /**
     * The drop area: a real button that opens the picker, dropping is a
     * shortcut. `multiple` takes several files and whole folders; otherwise
     * only the first file.
     */
    export const Dropzone: ComponentType<{
        onFiles: (files: PickedFile[]) => void;
        title: string;
        hint?: string;
        accept?: string;
        multiple?: boolean;
        disabled?: boolean;
        className?: string;
    }>;
    /**
     * The quiet gauge of a quota in a feature's header: the same count as the
     * refusal. It warns at 80 %, alarms at 95 %, and leads the workspace owner
     * to the plans. `limit: null` shows the usage alone. Bytes by default.
     */
    export const UsageMeter: ComponentType<{
        used: number;
        limit: number | null;
        label: string;
        explain?: string;
        format?: (value: number) => string;
        usedWord?: string;
    }>;

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

    // ── Usage ──────────────────────────────────────────────────────────────
    /**
     * Names the screen shown inside your feature's view (`'history'`,
     * `'site/traffic'`), for the instance's usage figures and bug reports.
     * Static segments only (lowercase letters, digits, dashes, slashes): never
     * an id, a name or anything typed. Counted only while your view is the one
     * open; the deepest screen mounted wins. `null` withdraws it.
     */
    export function useSubView(segment: string | null): void;

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
    export interface SendOptions {
        /**
         * How long the command may stay silent, 15 s by default: stretch it for
         * a command that queries a slow third party. With `onProgress`, each
         * update restarts the count.
         */
        timeoutMs?: number;
        /** The updates the handler reports through `ctx.progress`, as they arrive. */
        onProgress?: (update: Omit<RequestProgress, 'requestId'>) => void;
        /**
         * Run the command in another workspace of this instance (one of
         * `useWorkspaces()`) instead of the active one: copying a record
         * across. The server checks membership and rights there as usual.
         */
        workspaceId?: number;
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
            opts?: SendOptions
        ): Promise<z.output<Extract<C[number], { command: N }>['output'] & ZodType>>;
    };
    export function featureApi<const M extends FeatureManifest>(
        manifest: M
    ): {
        send<N extends M['commands'][number]['command']>(
            name: N,
            input: z.input<Extract<M['commands'][number], { command: N }>['input'] & ZodType>,
            opts?: SendOptions
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
        /** Offer to create a folder; false to pick what exists (what gets backed up). Default true. */
        allowCreate?: boolean;
    }>;
    /**
     * A path on a device: typed (a known path, an offline device) or picked by
     * browsing its folders. The label stays the caller's, outside a `<label>`
     * that would wrap the button: pass `id` for a `<label htmlFor>`, or
     * `aria-label`. `action` is one more button at the end of the row.
     */
    export const DeviceFolderField: ComponentType<{
        /** The device to browse; without it, "Parcourir" stays disabled. */
        device: { id: string; name: string } | null;
        value: string;
        onChange: (path: string) => void;
        placeholder?: string;
        id?: string;
        'aria-label'?: string;
        pickerDescription?: string;
        allowCreate?: boolean;
        disabled?: boolean;
        action?: ReactNode;
    }>;
    /**
     * The device through which a service is reached by its agent
     * (`relayDeviceOptions` on the server side). `load` is the module's
     * command listing them, `null` when read-only; a device one cannot choose
     * stays listed, disabled, with its reason underneath. The label and the
     * hint (what the device will see) stay with the caller.
     */
    export const DeviceRelayField: ComponentType<{
        value: string;
        onChange: (deviceId: string) => void;
        load: (() => Promise<readonly DeviceRelayOption[]>) | null;
        disabled?: boolean;
        id?: string;
        'aria-label'?: string;
    }>;
    /** The options of a `DeviceRelayField`, for a form that renders its own field. */
    export function useDeviceRelayOptions(
        load: (() => Promise<readonly DeviceRelayOption[]>) | null
    ): {
        devices: readonly DeviceRelayOption[];
        error: string | null;
    };
    /** One rule of a `PathExclusionsEditor`. */
    export interface PathExclusionItem {
        key: string | number;
        kind: PathExclusionKind;
        pattern: string;
    }
    /**
     * The exclusions of a walked folder (a CloudSync share, a backed-up
     * folder): exact path, component name or regex, relative to its root,
     * validated the way the agent will run them. `onAdd` gets a rule already
     * validated; `false` or a rejection keeps what was typed (say why where
     * you show your errors). `scope` ends the suggestions' tooltip ("le
     * partage", "le dossier").
     */
    export const PathExclusionsEditor: ComponentType<{
        items: readonly PathExclusionItem[];
        onAdd: (kind: PathExclusionKind, pattern: string) => boolean | Promise<boolean>;
        onRemove: (key: string | number) => void;
        canWrite: boolean;
        scope: string;
        disabled?: boolean;
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
     * The `href` for a link whose address comes from data (a remote feed, another
     * member's input, a probe): only http(s) and mailto come out, anything else is
     * `undefined`. Use it on every `<a href>` you do not write yourself.
     */
    export function safeHref(url: string | null | undefined): string | undefined;
    /**
     * A v4 UUID, secure context or not. `crypto.randomUUID` is only exposed over
     * HTTPS or on localhost, so an instance served in the clear on a LAN address
     * does not have it: use this instead of calling it yourself.
     */
    export function randomUuid(): string;
    /**
     * Writes `value` to the clipboard and says whether it worked: on `false` the
     * gesture still needs to be confirmed some other way, never silently dropped.
     * `navigator.clipboard` only exists in a secure context, so this falls back to
     * an offscreen selection. Never call the browser API directly.
     */
    export function copyText(value: string): Promise<boolean>;
    /**
     * The DevEye version this interface was built from: what an agent's
     * reported version is compared against to offer a self-update.
     */
    export const APP_VERSION: string;
    /**
     * A validated GET on one of the app's HTTP routes, authenticated as the
     * session is (an expired access token is renewed and the call replayed
     * once). For the routes that stay HTTP because they serve binaries.
     *
     * Always pass a PATH, never an absolute URL: the active workspace may live
     * on a remote DevEye instance, and the host routes the call there.
     */
    export function httpGet<T>(path: string, outputSchema?: ZodType<T>): Promise<T>;
    /**
     * A raw `fetch` on one of the app's HTTP routes, for a response that is not
     * the usual JSON envelope (a binary to download). Same routing and
     * authentication as {@link httpGet}; a bare `fetch('/api/...')` would reach
     * the wrong server from a remote workspace.
     */
    export function httpFetch(path: string, init?: RequestInit): Promise<Response>;
    /**
     * The account's plan, kept live. `null` while loading AND when this DevEye
     * has no plan provider (everything unlimited): never read it as "free".
     */
    export function useAccountPlan(): AccountPlan | null;
    /**
     * How many of the account's items its plan holds paused, by
     * `<featureId>.<quotaKey>`, only the keys that have some. Empty while
     * loading and without a plan provider.
     */
    export function usePlanPauses(): Readonly<Record<string, number>>;
    /** The badge of an item its owner's plan holds paused (a `stock` quota). */
    export const PlanPausedBadge: ComponentType<{ className?: string }>;
    /**
     * The notice above a list that holds items paused by the plan: how many,
     * why, what still runs, and for the workspace owner the way to the plans.
     * Renders nothing at 0. `one` and `many` name the item: "service
     * surveillé", "services surveillés".
     */
    export const PlanPausedNotice: ComponentType<{ count: number; one: string; many: string }>;
    /**
     * The look of a public page your module serves: its theme (`themes`, in
     * that order; `auto` follows the visitor) and its accent (an account
     * colour's name, a `#rrggbb`, or `''` for `ownAccent`, the page's own).
     * `preview` renders under the fields: a miniature of your page in that
     * look. Pair it with `pageAccentSchema` and `resolvePageAccent` from
     * `@deveye/types/sdk`.
     */
    export function PageLookFields<T extends PageThemeChoice>(props: {
        theme: T;
        accent: string;
        themes: readonly T[];
        ownAccent: Readonly<Record<PageTheme, string>>;
        disabled?: boolean;
        onChange: (next: { theme: T; accent: string }) => void;
        preview?: ReactNode;
    }): ReactNode;
    /** Opens an account view (`manifest.accountEntry`): the given module's, or the first one. No-op without any. */
    export function openAccountView(featureId?: string): void;
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
     * The caller's workspaces on this instance, the active one included, with
     * the features each has on. A target for `SendOptions.workspaceId`; the
     * rights there are the server's to judge.
     */
    export function useWorkspaces(): ReadonlyArray<{
        id: number;
        kind: 'personal' | 'shared';
        name: string;
        features: readonly string[];
    }>;
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
     * that module is not installed: degrade, never assume. A feature in preview
     * the current account does not see offers nothing either.
     */
    export function moduleClientProvider<T>(key: string): T | undefined;
    /** The signed-in user, `null` before the session answers. */
    export function useCurrentUser(): User | null;
    /**
     * The features in preview the current account does not see (it is not an
     * administrator): no tile, no link, no row that names them.
     */
    export function useHiddenFeatures(): ReadonlySet<string>;
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
