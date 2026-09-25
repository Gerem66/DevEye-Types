/**
 * The look of a public page a module serves (a booking page, a public board): a
 * theme and an accent colour. The pure half, shared by the server that renders
 * the page and the settings that choose it. The page lives outside the app,
 * often on a customer's domain, with none of the app's tokens: the colours are
 * spelled out here.
 */
import { z } from 'zod';

import type { UserColor } from '../domain/user';

/**
 * DevEye's icon, a 64 px PNG the host serves at this path on every listener,
 * so under every customer domain too: the tab icon of a public page that has
 * none of its own (`<link rel="icon" href={DEVEYE_ICON_PATH}>`). A real address
 * and not a data URL: link previews and crawlers fetch the icon, they never
 * read one inlined. Allow `img-src 'self'` if your page sets a policy.
 */
export const DEVEYE_ICON_PATH = '/deveye-icon.png';

export const PAGE_THEMES = ['light', 'dark'] as const;
export type PageTheme = (typeof PAGE_THEMES)[number];
/** `auto` follows the visitor's own light or dark setting. */
export type PageThemeChoice = PageTheme | 'auto';
export const pageThemeChoiceSchema = z.enum(['auto', ...PAGE_THEMES]);

/** The eight account colours, as the app's `--user-*` tokens spell them. */
export const PAGE_ACCENTS: Readonly<Record<UserColor, string>> = {
    red: '#ff6b81',
    orange: '#ff9f43',
    yellow: '#ffd54a',
    green: '#5ed17c',
    blue: '#4da8ff',
    indigo: '#7c8cff',
    purple: '#b088ff',
    pink: '#ff7ac6'
};

const HEX = /^#[0-9a-f]{6}$/;

/**
 * An accent as a module stores it: an account colour's name, a `#rrggbb`, or
 * the empty string for the page's own accent. Trimmed and lowercased.
 */
export const pageAccentSchema = z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === '' || value in PAGE_ACCENTS || HEX.test(value), {
        message: 'Une couleur de profil, un #rrggbb, ou rien.'
    });

/** The `#rrggbb` an accent stands for, or `null` for the page's own. Anything unreadable counts as none. */
export function resolvePageAccent(raw: string): string | null {
    const value = raw.trim().toLowerCase();
    if (value in PAGE_ACCENTS) return PAGE_ACCENTS[value as UserColor];
    return HEX.test(value) ? value : null;
}

function channels(hex: string): [number, number, number] {
    return [
        Number.parseInt(hex.slice(1, 3), 16),
        Number.parseInt(hex.slice(3, 5), 16),
        Number.parseInt(hex.slice(5, 7), 16)
    ];
}

/**
 * Dark or white text on this accent, by perceived luminance (the Rec. 709
 * weights WCAG uses for contrast).
 */
export function accentInk(hex: string): string {
    const [r, g, b] = channels(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140 ? '#10202e' : '#ffffff';
}

/** The quiet background of an accented surface: the same hue, almost transparent. */
export function accentSoft(hex: string, theme: PageTheme): string {
    const [r, g, b] = channels(hex);
    return `rgba(${r}, ${g}, ${b}, ${theme === 'dark' ? '0.22' : '0.14'})`;
}
