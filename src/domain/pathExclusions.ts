import { z } from 'zod';

/** Longest exclusion pattern, shared by the server, the agent and the screens. */
export const PATH_EXCLUSION_PATTERN_MAX = 512;

/**
 * How a path is excluded from a walked folder (a CloudSync share, a backed-up
 * folder), always against the path relative to that folder's root:
 *  - `path`: exact relative path, a file or a folder prefix;
 *  - `name`: exact name of any path component (`node_modules`, `.git`);
 *  - `regex`: regular expression on the whole relative path, run by the
 *    agent's linear-time engine (no lookaround, no backreference).
 */
export const pathExclusionKindSchema = z.enum(['path', 'name', 'regex']);
export type PathExclusionKind = z.infer<typeof pathExclusionKindSchema>;

export const pathExclusionSchema = z.object({
    kind: pathExclusionKindSchema,
    pattern: z.string().min(1).max(PATH_EXCLUSION_PATTERN_MAX)
});
export type PathExclusion = z.infer<typeof pathExclusionSchema>;

/**
 * One-click exclusions, all `name`: that kind catches the folder anywhere in
 * the tree, not only at the root. Dependencies and caches a project rebuilds.
 */
export const PATH_EXCLUSION_SUGGESTIONS: readonly string[] = [
    'node_modules',
    '.git',
    '.venv',
    '__pycache__',
    'target',
    'dist',
    'build',
    '.cache',
    '.next',
    '.idea'
];

const hasControlChar = (text: string): boolean => [...text].some((c) => c.charCodeAt(0) < 0x20);

/**
 * JavaScript accepts these, the agent's engine refuses them: a pattern the
 * agent cannot compile would fail every walk of the folder.
 */
const UNSUPPORTED_REGEX = /\(\?<?[=!]|\\[1-9]|\\k</;

/** Why a pattern cannot be saved (French, shown as is), or `null` when it can. */
export function pathExclusionProblem(kind: PathExclusionKind, pattern: string): string | null {
    if (pattern.length === 0) return 'Motif vide.';
    if (pattern.length > PATH_EXCLUSION_PATTERN_MAX) {
        return `Motif de plus de ${PATH_EXCLUSION_PATTERN_MAX} caractères.`;
    }
    switch (kind) {
        case 'path': {
            if (pattern.includes('\\')) return 'Un chemin s’écrit avec des « / ».';
            if (hasControlChar(pattern)) return 'Caractère de contrôle interdit.';
            if (pattern.startsWith('/')) {
                return 'Le chemin est relatif au dossier : sans « / » au début.';
            }
            const segments = pattern.split('/');
            if (segments.some((s) => s === '' || s === '.' || s === '..')) {
                return 'Chemin relatif invalide : ni segment vide, ni « . », ni « .. ».';
            }
            return null;
        }
        case 'name':
            if (pattern.includes('/') || pattern.includes('\\')) {
                return 'Un nom ne peut pas contenir de séparateur.';
            }
            if (hasControlChar(pattern)) return 'Caractère de contrôle interdit.';
            if (pattern === '.' || pattern === '..') return 'Nom invalide.';
            return null;
        case 'regex':
            try {
                new RegExp(pattern);
            } catch {
                return 'Expression régulière invalide.';
            }
            if (UNSUPPORTED_REGEX.test(pattern)) {
                return 'Ni lookaround, ni référence arrière : l’agent ne les exécute pas.';
            }
            return null;
    }
}
