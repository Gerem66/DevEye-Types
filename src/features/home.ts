import { z } from 'zod';
import {
    homeLayoutSchema,
    shortcutPreviewSchema,
    shortcutTemplateSchema,
    SHORTCUT_URL_MAX_LENGTH
} from '../domain/home';

/** Persist the user's home grid layout (tiles + order). */
export const homeSetLayout = {
    command: 'home.setLayout' as const,
    input: homeLayoutSchema,
    output: z.object({ ok: z.literal(true) })
};

/**
 * Fetch a live preview for a rich shortcut template (e.g. a GitHub profile).
 * Server-side fetch + cache so the client avoids CORS / rate-limit handling and
 * the whole app stays "one typed WS command per action".
 */
export const homeShortcutPreview = {
    command: 'home.shortcutPreview' as const,
    input: z.object({
        template: shortcutTemplateSchema,
        url: z.string().url().max(SHORTCUT_URL_MAX_LENGTH)
    }),
    output: shortcutPreviewSchema
};

export const homeCommands = [homeSetLayout, homeShortcutPreview] as const;
