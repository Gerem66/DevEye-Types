/**
 * A module's environment variables, declared once as plain data.
 *
 * A module reads its own variables (never through the host), and each one has
 * a default that works: an install without any of these lines must run. But a
 * default applied in silence is a trap when it guesses at the operator's world
 * (a site address, a storage path). So the same spec is handed to the host
 * (`FeatureServer.env`), which reads it again at boot and warns, once per
 * module, about every variable left to its default.
 *
 * Pure: a spec is data and `readModuleEnv` reads only the source it is given,
 * so the host's copy of this package and a module's copy agree.
 */

interface ModuleEnvCommon {
    /**
     * Absent without a warning: a credential or an opt-in the install may well
     * not use (an OAuth client, a certificate supplied by the operator).
     */
    optional?: boolean;
}

/** An integer, `min` or more (1 when omitted). */
export interface ModuleEnvInt extends ModuleEnvCommon {
    kind: 'int';
    default: number;
    min?: number;
}

export interface ModuleEnvText extends ModuleEnvCommon {
    kind: 'text';
    default: string;
}

export interface ModuleEnvPath extends ModuleEnvCommon {
    kind: 'path';
    default: string;
}

/** An http(s) address. Set to an empty string, it means "none", never the default. */
export interface ModuleEnvUrl extends ModuleEnvCommon {
    kind: 'url';
    default: string;
}

/** `true`/`1` or `false`/`0`, in any case. */
export interface ModuleEnvFlag extends ModuleEnvCommon {
    kind: 'flag';
    default: boolean;
}

export interface ModuleEnvChoice<C extends string = string> extends ModuleEnvCommon {
    kind: 'choice';
    default: C;
    choices: readonly C[];
}

/** Never printed. Its default is the empty string. */
export interface ModuleEnvSecret extends ModuleEnvCommon {
    kind: 'secret';
}

export type ModuleEnvVar =
    | ModuleEnvInt
    | ModuleEnvText
    | ModuleEnvPath
    | ModuleEnvUrl
    | ModuleEnvFlag
    | ModuleEnvChoice
    | ModuleEnvSecret;

export type ModuleEnvSpec = Readonly<Record<string, ModuleEnvVar>>;

type ModuleEnvValue<V> = V extends ModuleEnvInt
    ? number
    : V extends ModuleEnvFlag
      ? boolean
      : V extends ModuleEnvChoice<infer C>
        ? C
        : string;

/** Writable on purpose: tests point a module at a scratch directory by assignment. */
export type ModuleEnvValues<S extends ModuleEnvSpec> = {
    -readonly [K in keyof S]: ModuleEnvValue<S[K]>;
};

/** A variable that fell back to its default, as the host reports it at boot. */
export interface ModuleEnvDefault {
    name: string;
    /** `unset`: absent from the environment. `invalid`: present, but unreadable as its kind. */
    reason: 'unset' | 'invalid';
    /** The value applied. A secret has no default: it is always the empty string here. */
    value: string | number | boolean;
}

export const MODULE_ENV_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const KINDS = new Set<string>(['int', 'text', 'path', 'url', 'flag', 'choice', 'secret']);

/** Identity, for inference: `choices` keep their literal types, values their kinds. */
export function defineModuleEnv<const S extends ModuleEnvSpec>(spec: S): S {
    return spec;
}

/** What is wrong with a spec, or `null`. The host refuses to boot a module whose spec has a problem. */
export function moduleEnvProblem(spec: unknown): string | null {
    if (typeof spec !== 'object' || spec === null) return 'the spec is not an object';
    for (const [name, raw] of Object.entries(spec)) {
        if (!MODULE_ENV_NAME_PATTERN.test(name)) return `${name}: not an environment variable name`;
        const variable = raw as Partial<ModuleEnvVar> | null;
        if (
            typeof variable !== 'object' ||
            variable === null ||
            !KINDS.has(String(variable.kind))
        ) {
            return `${name}: unknown kind`;
        }
        if (
            variable.kind === 'choice' &&
            !(variable.choices ?? []).includes(variable.default as string)
        ) {
            return `${name}: the default is not one of the choices`;
        }
    }
    return null;
}

/**
 * One variable, read. `null` stands for "unreadable": the caller applies the
 * default and reports it. An empty string is an explicit setting (the template
 * ships blanks): it falls back to the default without a word, except for an
 * address, where it means "none".
 */
function parse(variable: ModuleEnvVar, raw: string): string | number | boolean | null {
    const value = raw.trim();
    switch (variable.kind) {
        case 'int': {
            if (value === '') return variable.default;
            const n = Number(value);
            return Number.isInteger(n) && n >= (variable.min ?? 1) ? n : null;
        }
        case 'text':
        case 'path':
            return value === '' ? variable.default : value;
        case 'url':
            if (value === '') return '';
            return /^https?:\/\/\S+$/.test(value) ? value : null;
        case 'flag': {
            const word = value.toLowerCase();
            if (word === '') return variable.default;
            if (word === 'true' || word === '1') return true;
            if (word === 'false' || word === '0') return false;
            return null;
        }
        case 'choice':
            if (value === '') return variable.default;
            return variable.choices.includes(value) ? value : null;
        case 'secret':
            return value;
    }
}

function fallbackOf(variable: ModuleEnvVar): string | number | boolean {
    return variable.kind === 'secret' ? '' : variable.default;
}

/**
 * Read a spec from `source` (the process environment by default). Every
 * variable gets a value; `defaulted` lists those that fell back, except an
 * `optional` one left unset.
 */
export function readModuleEnv<S extends ModuleEnvSpec>(
    spec: S,
    source: Readonly<Record<string, string | undefined>> = process.env
): { values: ModuleEnvValues<S>; defaulted: ModuleEnvDefault[] } {
    const values: Record<string, string | number | boolean> = {};
    const defaulted: ModuleEnvDefault[] = [];
    for (const [name, variable] of Object.entries(spec)) {
        const raw = source[name];
        const parsed = raw === undefined ? null : parse(variable, raw);
        if (parsed !== null) {
            values[name] = parsed;
            continue;
        }
        const fallback = fallbackOf(variable);
        values[name] = fallback;
        if (raw === undefined && variable.optional) continue;
        defaulted.push({ name, reason: raw === undefined ? 'unset' : 'invalid', value: fallback });
    }
    return { values: values as ModuleEnvValues<S>, defaulted };
}
