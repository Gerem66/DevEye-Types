import type { ZodType } from 'zod';
import type { FeatureDescriptor } from '../domain/featureRegistry';
import {
    EXTERNAL_FEATURE_ID_PATTERN,
    isExternalFeatureId,
    type ExternalFeatureId,
    type FeatureId
} from '../domain/workspaceRole';

/**
 * The feature manifest: everything DevEye needs to know about a feature,
 * declared once.
 *
 * Historically this knowledge was scattered across ~14 registration points
 * (descriptor, catalog entry, settings wiring tables, invalidation keys,
 * teleport segments...). A module declares all of it here; the app's generated
 * glue reads the manifest and wires every screen from it. Native features are
 * being migrated onto the same contract (Weather first).
 */

/**
 * One WebSocket command contract. Identical in shape to the descriptors native
 * features declare in `@deveye/types/src/features/*`: the server validates the
 * input before your handler runs and the output after it returns, both ways,
 * so a payload that does not match a schema never crosses the wire.
 */
export interface ManifestCommand<Cmd extends string = string> {
    /** Must start with `<manifest.id>.` (enforced by {@link validateManifest}). */
    command: Cmd;
    input: ZodType;
    output: ZodType;
}

/**
 * A permission your feature defines beyond the built-in none/read/write axis.
 * It appears in every workspace role editor, under your feature's row, and is
 * stored in the role's grant (`extras`).
 *
 * Two bounded types only:
 *  - `toggle`: a boolean. Absent from a grant = **false** (fail-closed).
 *    The workspace owner always gets `true`.
 *  - `choice`: one value among 2 to 5 options. Absent = `default`, which MUST
 *    be the least-privileged option. The owner gets `ownerValue`.
 */
export type ExtraPermissionSpec =
    | {
          /** Unique within the feature. `/^[a-z][a-zA-Z0-9]{1,23}$/`. */
          key: string;
          /** Short label shown next to the control in the role editor. */
          label: string;
          /** One sentence: what granting this allows. */
          description: string;
          type: 'toggle';
      }
    | {
          key: string;
          label: string;
          description: string;
          type: 'choice';
          options: readonly { value: string; label: string }[];
          /** Value when the grant is silent. MUST be the least-privileged option. */
          default: string;
          /** Value the workspace owner (who has everything) receives. */
          ownerValue: string;
      };

/** Hard cap on `extraPermissions`: keeps role editors legible. */
export const MAX_EXTRA_PERMISSIONS = 4;

const EXTRA_KEY_PATTERN = /^[a-z][a-zA-Z0-9]{1,23}$/;

/**
 * Native capabilities your server code may call through `ctx.deveye`.
 * Calling a facade you did not declare throws `forbidden`: the declaration
 * is also what an administrator reviews before installing your module.
 */
export type NativeCapability =
    | 'notify'
    | 'mail.accounts'
    | 'members.read'
    /** Read/authorize the workspace's devices. */
    | 'devices.read'
    /**
     * The full agent-fleet sync transport (outbound requests, browser fan-out,
     * per-socket subscriptions). Reserved for repatriated NATIVE features: the
     * agent protocol is app infrastructure, not a third-party surface.
     */
    | 'agents'
    /**
     * Read the devices' telemetry (process instants, metric rows, evidence
     * pinning). Reserved for native-id modules like `'agents'`: the metric
     * store is app infrastructure.
     */
    | 'telemetry.read';

/**
 * Settings tabs the shell can render for you.
 *  - `'notifications'` and `'permissions'` are fully generic: DevEye renders
 *    them from the manifest alone, you write no component.
 *  - `'general'` and `'sources'` need a panel component, provided by your
 *    client entry (`settingsPanels`), keyed by the tab id.
 */
export type SettingsTab = 'general' | 'sources' | 'notifications' | 'permissions';

/** A custom settings tab. Needs a matching panel in `settingsPanels`. */
export interface CustomTabRef {
    /** `/^[a-z][a-z0-9]{1,23}$/`, distinct from the built-in tab ids. */
    id: string;
    label: string;
    /** Icon class suffix; defaults to `settings`. */
    icon?: string;
}

const CUSTOM_TAB_PATTERN = /^[a-z][a-z0-9]{1,23}$/;
const BUILTIN_TABS: readonly string[] = [
    'general',
    'sources',
    'notifications',
    'permissions',
    'sync',
    'encryption',
    'sharing'
];

/** See {@link FeatureManifest.alsoInvalidatedBy}. */
export interface CrossTopicInvalidation {
    /** A NATIVE live topic that is not this feature's own. */
    topic: string;
    /** Subset of `resources` to re-fetch when it beats. */
    keys: readonly string[];
}

/** Where a feature's card can live on the home grid. */
export type FeatureCategory = 'supervision' | 'security' | 'dev' | 'work' | 'daily' | 'analysis';

export interface FeatureManifest<Id extends FeatureId = FeatureId> {
    /** External modules: `x-<slug>`. Native features keep their enum id. */
    id: Id;
    /** UI title. English for external modules, French for natives. */
    label: string;
    /** One sentence: what the feature does. Feeds the catalog and the roles screen. */
    description: string;
    /**
     * Icon class suffix (`icon-<icon>`). External modules ship the SVG in
     * `assets/icons/`; the app's codegen wires the class as
     * `x-<slug>-<name>` and rewrites this field accordingly.
     */
    icon: string;
    category: FeatureCategory;

    /** The feature can send notifications. Opens the Notifications tab. */
    notifies: boolean;
    /** The feature owns addressable items with per-item settings. */
    hasItems: boolean;
    /** Singular noun for item-scope screen titles. Required when `hasItems`. */
    itemNoun?: string;
    /** Feature-scope reusable settings (API keys, destinations). Opens the Sources tab. */
    sources?: { hint: string };
    /**
     * Whether an item can be projected into another workspace. Decided by
     * encryption, not preference: only the open tier is readable by the
     * server alone, so only open-tier rows can be served elsewhere.
     *
     * Anything but `'never'` commits the module to the sharing contract: a
     * server entry with `items` (the app must find an item's home), listings
     * that read `ctx.sharing.scope()` and pick the cipher row by row, and
     * `ctx.items.restrictions()` applied to what they return. External modules
     * declare `'never'` for now: the wiring is generic, but no third-party
     * module has exercised it yet, and lifting the rule is one line here.
     */
    shareTier: 'open' | 'perItem' | 'never';

    /** Card rendering on the home grid. `compact` halves the minimum height. */
    tile?: { compact?: boolean };

    /**
     * The feature offers a compact TOPBAR widget (pinned top-right of the
     * navbar). Declares only the DATA the picker shows; the component itself
     * comes from the client entry (`FeatureClient.TopbarWidget`). Offered and
     * rendered only to members whose role grants the feature: absence of the
     * grant means absence of the widget, same rule as the grid card.
     */
    topbarWidget?: { description: string };

    /** See {@link ExtraPermissionSpec}. At most {@link MAX_EXTRA_PERMISSIONS}. */
    extraPermissions?: readonly ExtraPermissionSpec[];
    /** See {@link NativeCapability}. */
    nativeCapabilities?: readonly NativeCapability[];

    /**
     * Resource keys this feature owns, `<id>.<name>` (by convention, the
     * command whose result the key caches). The client invalidation bus and
     * `useResource` are keyed on them.
     */
    resources: readonly string[];
    /**
     * Keys re-fetched when the feature's live topic fires (a mutation by any
     * member). Defaults to all of `resources`.
     */
    invalidatedByTopic?: readonly string[];

    /**
     * Keys ALSO re-fetched when another feature's topic fires. The escape
     * hatch for real data coupling (CloudSync's share rows carry device names:
     * a device rename must refresh the share list). Native topics only, and
     * never your own.
     */
    alsoInvalidatedBy?: readonly CrossTopicInvalidation[];

    /**
     * Prefix override for commands and resources. Native-id modules only, and
     * only when the historical command casing differs from the id (cloudsync
     * owns `cloudSync.*` commands). Must equal `<id>.` case-insensitively.
     * Defaults to `<id>.`.
     */
    commandPrefix?: string;

    /**
     * Builds the live/teleport segment for one item, e.g. `(id) => `job:${id}``.
     * MUST return byte-for-byte what your view declares via `useLiveSegment('l1', ...)`:
     * it is a rendezvous, not a convention. Requires `hasItems`.
     */
    itemSegment?: (itemId: number | string) => string;

    /** Settings tabs, per scope. Omit a scope to render no settings there. */
    settings?: {
        feature?: readonly (SettingsTab | CustomTabRef)[];
        item?: readonly (SettingsTab | CustomTabRef)[];
    };

    commands: readonly ManifestCommand[];
}

function fail(id: string, message: string): never {
    throw new Error(`FeatureManifest « ${id} »: ${message}`);
}

/**
 * Validates the data half of a manifest (shapes, prefixes, coherence).
 * Called by the template's standalone CI and again by the app at registration,
 * so a violation surfaces before the module ever meets a runtime.
 */
export function validateManifest(m: FeatureManifest): void {
    const external = isExternalFeatureId(m.id);
    if (external && !EXTERNAL_FEATURE_ID_PATTERN.test(m.id)) fail(m.id, 'invalid external id');
    if (!m.label.trim()) fail(m.id, 'empty label');
    if (!m.description.trim()) fail(m.id, 'empty description');
    if (m.hasItems && !m.itemNoun?.trim()) fail(m.id, 'hasItems requires itemNoun');
    if (!m.hasItems && m.itemSegment) fail(m.id, 'itemSegment requires hasItems');
    if (external && m.shareTier !== 'never') {
        fail(m.id, "external modules must declare shareTier 'never' for now");
    }

    if (m.commandPrefix !== undefined) {
        if (external) fail(m.id, 'commandPrefix is reserved for native-id modules');
        if (m.commandPrefix.toLowerCase() !== `${m.id}.`.toLowerCase()) {
            fail(
                m.id,
                `commandPrefix « ${m.commandPrefix} » must equal « ${m.id}. » case-insensitively`
            );
        }
    }
    const prefix = m.commandPrefix ?? `${m.id}.`;
    for (const c of m.commands) {
        if (!c.command.startsWith(prefix)) {
            fail(m.id, `command « ${c.command} » must start with « ${prefix} »`);
        }
    }
    for (const key of m.resources) {
        if (!key.startsWith(prefix)) {
            fail(m.id, `resource « ${key} » must start with « ${prefix} »`);
        }
    }
    for (const key of m.invalidatedByTopic ?? []) {
        if (!m.resources.includes(key)) {
            fail(m.id, `invalidatedByTopic « ${key} » is not in resources`);
        }
    }

    const cross = m.alsoInvalidatedBy ?? [];
    if (cross.length > 4) fail(m.id, 'more than 4 alsoInvalidatedBy entries');
    for (const entry of cross) {
        if (entry.topic === m.id) fail(m.id, "alsoInvalidatedBy must name ANOTHER feature's topic");
        for (const key of entry.keys) {
            if (!m.resources.includes(key)) {
                fail(m.id, `alsoInvalidatedBy key « ${key} » is not in resources`);
            }
        }
    }

    for (const reserved of ['agents', 'telemetry.read'] as const) {
        if ((m.nativeCapabilities ?? []).includes(reserved) && external) {
            fail(m.id, `capability '${reserved}' is reserved for native-id modules`);
        }
    }

    const extras = m.extraPermissions ?? [];
    if (extras.length > MAX_EXTRA_PERMISSIONS) {
        fail(m.id, `more than ${MAX_EXTRA_PERMISSIONS} extra permissions`);
    }
    const seen = new Set<string>();
    for (const spec of extras) {
        if (!EXTRA_KEY_PATTERN.test(spec.key)) fail(m.id, `invalid extra key « ${spec.key} »`);
        if (seen.has(spec.key)) fail(m.id, `duplicate extra key « ${spec.key} »`);
        seen.add(spec.key);
        if (spec.type === 'choice') {
            if (spec.options.length < 2 || spec.options.length > 5) {
                fail(m.id, `extra « ${spec.key} »: 2 to 5 options required`);
            }
            const values = spec.options.map((o) => o.value);
            if (new Set(values).size !== values.length) {
                fail(m.id, `extra « ${spec.key} »: duplicate option values`);
            }
            if (!values.includes(spec.default)) {
                fail(m.id, `extra « ${spec.key} »: default is not an option`);
            }
            if (!values.includes(spec.ownerValue)) {
                fail(m.id, `extra « ${spec.key} »: ownerValue is not an option`);
            }
        }
    }

    for (const scope of ['feature', 'item'] as const) {
        for (const tab of m.settings?.[scope] ?? []) {
            if (typeof tab === 'string') {
                if (tab === 'notifications' && !m.notifies) {
                    fail(m.id, 'notifications tab requires notifies');
                }
                if (tab === 'sources' && !m.sources) fail(m.id, 'sources tab requires sources');
                if (tab === 'sources' && scope === 'item') {
                    fail(m.id, 'sources is a feature-scope tab');
                }
            } else {
                if (!CUSTOM_TAB_PATTERN.test(tab.id) || BUILTIN_TABS.includes(tab.id)) {
                    fail(m.id, `invalid custom tab id « ${tab.id} »`);
                }
            }
        }
        if ((m.settings?.[scope]?.length ?? 0) > 0 && scope === 'item' && !m.hasItems) {
            fail(m.id, 'item settings require hasItems');
        }
    }
}

/**
 * The registry descriptor of an EXTERNAL module, read off its manifest: what
 * the roles screen, the settings shell and the catalog need to know without
 * opening the module. Natives keep their published descriptor; the app's
 * server and client registries both project through here.
 */
export function externalDescriptorOf(
    m: FeatureManifest
): FeatureDescriptor & { id: ExternalFeatureId } {
    if (!isExternalFeatureId(m.id)) {
        throw new Error(`externalDescriptorOf: « ${m.id} » is not an external id`);
    }
    return {
        id: m.id,
        label: m.label,
        description: m.description,
        icon: m.icon,
        notifies: m.notifies,
        hasItems: m.hasItems,
        itemNoun: m.itemNoun,
        sources: m.sources,
        shareTier: m.shareTier
    };
}

export interface ExtrasResolver {
    canExtra(key: string): boolean;
    extraValue(key: string): string;
}

/**
 * The runtime rules of extra permissions, shared by the app's request context
 * and the test harness so the two can never drift:
 *  - a key the manifest does not declare, or of the other kind, yields
 *    `false` / `''`;
 *  - the workspace owner holds every toggle and gets `ownerValue` of every
 *    choice;
 *  - a member holds a toggle when the grant says `true`, and gets a choice's
 *    granted value when it is one of the options, `default` otherwise.
 */
export function resolveExtras(
    specs: readonly ExtraPermissionSpec[] | undefined,
    isOwner: boolean,
    granted: Readonly<Record<string, boolean | string>>
): ExtrasResolver {
    const byKey = new Map((specs ?? []).map((spec) => [spec.key, spec]));
    return {
        canExtra(key) {
            const spec = byKey.get(key);
            if (!spec || spec.type !== 'toggle') return false;
            return isOwner || granted[key] === true;
        },
        extraValue(key) {
            const spec = byKey.get(key);
            if (!spec || spec.type !== 'choice') return '';
            if (isOwner) return spec.ownerValue;
            const value = granted[key];
            return typeof value === 'string' && spec.options.some((o) => o.value === value)
                ? value
                : spec.default;
        }
    };
}
