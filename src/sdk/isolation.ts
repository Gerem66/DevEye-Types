import { z, type ZodType } from 'zod';

import type { SdkE2eContext } from './server';

/**
 * Tenant isolation, declared: what your feature seeds in a victim's workspace,
 * and what an intruder then attempts. The host turns it into the end-to-end
 * scenario `<feature>.isolation`, played by two throwaway accounts:
 *
 * 1. the victim seeds in a shared workspace and reads its data;
 * 2. the intruder, from its own workspace, attempts every probe: each must be
 *    refused, and no answer may carry the canary;
 * 3. the same with the victim's workspace on the envelope, then as a member
 *    whose role grants nothing;
 * 4. as a member with write access the intruder does see the data, then every
 *    item is closed to its role: refused again, and gone from the lists;
 * 5. the victim reads its data again, unchanged.
 */

/** A command and its input. */
export type SdkIsolationProbe = readonly [command: string, input: unknown];

/** What `seed` returns: one id per thing it created, by a name the probes use. */
export type SdkIsolationIds = Readonly<Record<string, number | string>>;

export interface SdkIsolationSeedContext<Repo = unknown> extends SdkE2eContext<Repo> {
    /** The victim's shared workspace: `send` already targets it. */
    workspaceId: number;
    /** A string no real data holds. Put it in every title, name and body you create. */
    canary: string;
    /**
     * A second one, for what a shareable item shows (the title of each thing
     * named in `items`), and nothing else: once the item is closed to a role,
     * no answer to that role may carry it.
     */
    itemCanary: string;
}

export interface FeatureIsolation<Repo = unknown, Ids extends SdkIsolationIds = SdkIsolationIds> {
    /**
     * The keys `seed` returns, with plausible values: what lets the host check
     * `probes` and `reads` against your command schemas without a server.
     */
    sampleIds: Ids;
    /**
     * Creates one thing of each kind in the victim's workspace and returns
     * their ids. Nothing to undo: the workspace is deleted afterwards. What
     * lives outside your tables still takes a `ctx.defer`.
     */
    seed(ctx: SdkIsolationSeedContext<Repo>): Promise<Ids>;
    /** What the victim reads, before and after: the answers must not change. */
    reads(ids: Ids): readonly SdkIsolationProbe[];
    /**
     * What the intruder attempts with the victim's ids. A command whose only
     * required fields are ids of `sampleIds` (`{ noteId }`) is probed by the
     * host on its own: write the others, with an input that would succeed for
     * the victim.
     */
    probes(ids: Ids): readonly SdkIsolationProbe[];
    /**
     * The ids that name shareable items (the ones a role can be closed to):
     * key of `sampleIds`. Without it, the per-item step is skipped.
     */
    items?: readonly (keyof Ids & string)[];
    /**
     * Commands that take an id and are not probed, with the reason: a command
     * whose id is not a row of yours (a provider's reference), one that only
     * an administrator runs.
     */
    exempt?: Readonly<Record<string, string>>;
    /**
     * Probed commands that answer instead of refusing an id that is not
     * theirs, with the reason (a reorder that drops stray ids, because the
     * list a client sends may be stale). The host then only requires that the
     * answer carries nothing of the victim and that its data does not move.
     */
    lenient?: Readonly<Record<string, string>>;
}

const ID_FIELD = /^ids?$|Ids?$/;

type AnyZod = ZodType & {
    shape?: Record<string, ZodType>;
    element?: ZodType;
    options?: readonly ZodType[];
    unwrap?(): ZodType;
    def?: { innerType?: ZodType; in?: ZodType; type?: string };
};

/** The schema under its wrappers (optional, nullable, default, readonly, pipe). */
function bare(schema: ZodType): AnyZod {
    let current = schema as AnyZod;
    for (let depth = 0; depth < 12; depth++) {
        const inner: ZodType | undefined = current.def?.innerType ?? current.def?.in;
        if (!inner || current.shape) return current;
        current = inner as AnyZod;
    }
    return current;
}

function isOptional(schema: ZodType): boolean {
    return schema.safeParse(undefined).success;
}

/**
 * The fields of a command input that hold an id (`id`, `ids`, `…Id`, `…Ids`),
 * as dotted paths, through nested objects, arrays and unions.
 */
export function idFields(input: ZodType): string[] {
    const out = new Set<string>();
    const walk = (schema: ZodType, path: string): void => {
        const node = bare(schema);
        if (node.shape) {
            for (const [key, child] of Object.entries(node.shape)) {
                const at = path ? `${path}.${key}` : key;
                if (ID_FIELD.test(key)) out.add(at);
                walk(child, at);
            }
        } else if (node.element) walk(node.element, path);
        else if (node.options) for (const option of node.options) walk(option, path);
    };
    walk(input, '');
    return [...out].sort();
}

interface CommandLike {
    command: string;
    input: ZodType;
    access?: { item?: unknown };
}

/** The probe the host writes itself: every required field is an id that was seeded. */
function automaticInput(
    command: CommandLike,
    ids: SdkIsolationIds
): Record<string, number | string> | null {
    const shape = bare(command.input).shape;
    if (!shape) return null;
    const required = Object.entries(shape).filter(([, field]) => !isOptional(field));
    if (required.length === 0 || required.some(([key]) => !(key in ids))) return null;
    const input = Object.fromEntries(required.map(([key]) => [key, ids[key]]));
    return command.input.safeParse(input).success ? input : null;
}

const needsProbe = (command: CommandLike): boolean =>
    command.access?.item !== undefined || idFields(command.input).length > 0;

/**
 * Every probe played for these ids: the ones the feature wrote, then the ones
 * the host derives for commands that only take seeded ids.
 */
export function isolationProbes(
    commands: readonly CommandLike[],
    isolation: Pick<FeatureIsolation, 'probes' | 'exempt'>,
    ids: SdkIsolationIds
): SdkIsolationProbe[] {
    const written = isolation.probes(ids);
    const covered = new Set(written.map(([command]) => command));
    const derived: SdkIsolationProbe[] = [];
    for (const command of commands) {
        if (covered.has(command.command) || isolation.exempt?.[command.command] !== undefined) {
            continue;
        }
        if (!needsProbe(command)) continue;
        const input = automaticInput(command, ids);
        if (input) derived.push([command.command, input]);
    }
    return [...written, ...derived];
}

/**
 * What is wrong with an isolation block, checked without a server: assert it
 * is empty in a test of your feature. A command that takes an id (or declares
 * `access.item`) has a probe or a reasoned exemption; every probe and read
 * names a command of yours with an input its schema accepts.
 */
export function isolationProblems(
    commands: readonly CommandLike[],
    isolation: FeatureIsolation
): string[] {
    const problems: string[] = [];
    const byName = new Map(commands.map((command) => [command.command, command]));
    const ids = isolation.sampleIds;

    const checkCalls = (what: string, calls: readonly SdkIsolationProbe[]): void => {
        for (const [name, input] of calls) {
            const command = byName.get(name);
            if (!command) {
                problems.push(`${what} "${name}": not a command of this feature`);
                continue;
            }
            const parsed = command.input.safeParse(input);
            if (!parsed.success) {
                problems.push(
                    `${what} "${name}": input refused by its schema (${z.prettifyError(parsed.error)})`
                );
            }
        }
    };
    checkCalls('probe', isolation.probes(ids));
    checkCalls('read', isolation.reads(ids));
    if (isolation.reads(ids).length === 0) {
        problems.push('reads: at least one command the victim reads its data with');
    }

    const probed = new Set(isolationProbes(commands, isolation, ids).map(([name]) => name));
    for (const command of commands) {
        const reason = isolation.exempt?.[command.command];
        if (!needsProbe(command)) {
            if (reason !== undefined) {
                problems.push(`exempt "${command.command}": takes no id, nothing to exempt`);
            }
            continue;
        }
        if (reason !== undefined) {
            if (reason.trim() === '') problems.push(`exempt "${command.command}": no reason`);
            if (probed.has(command.command)) {
                problems.push(`exempt "${command.command}": it is probed too`);
            }
            continue;
        }
        if (!probed.has(command.command)) {
            const fields = idFields(command.input).join(', ') || 'access.item';
            problems.push(
                `"${command.command}" takes an id (${fields}) and has neither a probe nor an exemption`
            );
        }
    }
    for (const name of Object.keys(isolation.exempt ?? {})) {
        if (!byName.has(name)) problems.push(`exempt "${name}": not a command of this feature`);
    }
    for (const [name, reason] of Object.entries(isolation.lenient ?? {})) {
        if (!probed.has(name)) problems.push(`lenient "${name}": not a probed command`);
        else if (reason.trim() === '') problems.push(`lenient "${name}": no reason`);
    }
    for (const key of isolation.items ?? []) {
        if (!(key in ids)) problems.push(`items "${key}": not a key of sampleIds`);
    }
    return problems;
}
