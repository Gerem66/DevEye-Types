import { z } from 'zod';
import { userColorSchema, userSettingFlagSchema } from '../domain/user';

/**
 * Upper bound on the avatar data URL length (characters ≈ bytes for base64
 * ASCII). ~1.5 MB comfortably fits a client-resized JPEG/PNG/WebP thumbnail
 * while bounding the WS payload and the `users.avatar` column.
 */
export const AVATAR_MAX_LENGTH = 1_500_000;

/** Accepted image data URL prefixes for an uploaded avatar. */
const avatarDataUrl = z
    .string()
    .min(1)
    .max(AVATAR_MAX_LENGTH)
    .regex(
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/,
        'Avatar must be a base64 image data URL'
    );

export const userSetAvatar = {
    command: 'user.setAvatar' as const,
    input: z.object({ avatar: avatarDataUrl }),
    output: z.object({ avatar: z.string() })
};

/** Max length of a wallpaper data URL stored in the theme (~4 MB in base64). */
export const THEME_IMAGE_MAX_LENGTH = 4_200_000;

/** Number of saved background slots kept in the appearance gallery. */
export const THEME_SLOT_COUNT = 5;

/**
 * Upper bound on one saved slot value. Slots hold *compressed* data URLs (the
 * client downscales before saving) or a short raw URL, so this is a safety cap,
 * not the typical size — it keeps the whole theme JSON (5 slots + active image)
 * within the browser's localStorage budget and the `users.theme` column.
 */
export const THEME_SLOT_IMAGE_MAX_LENGTH = 1_500_000;

export const themeStateSchema = z.object({
    accent: z.string().nullable(),
    bgPreset: z.string().nullable(),
    bgImage: z.string().max(THEME_IMAGE_MAX_LENGTH).nullable(),
    /**
     * Saved background gallery: up to THEME_SLOT_COUNT slots, each a compressed
     * data URL / raw URL, or null for an empty slot. Defaults to empty so themes
     * saved before this field parse cleanly.
     */
    bgImages: z
        .array(z.string().max(THEME_SLOT_IMAGE_MAX_LENGTH).nullable())
        .max(THEME_SLOT_COUNT)
        .default([]),
    bgDim: z.number().int().min(0).max(100),
    bgBlur: z.number().int().min(0).max(100)
});

export type ThemeStateDTO = z.infer<typeof themeStateSchema>;

export const userSetTheme = {
    command: 'user.setTheme' as const,
    input: themeStateSchema,
    output: z.object({ ok: z.literal(true) })
};

/**
 * Couleur d'identité du compte. En `scope: 'account'` côté serveur : elle suit
 * le compte, pas l'espace depuis lequel on la change.
 */
export const userSetColor = {
    command: 'user.setColor' as const,
    input: z.object({ color: userColorSchema }),
    output: z.object({ color: userColorSchema })
};

/**
 * Pose ou retire un drapeau de compte. Une commande unique pour tous les
 * drapeaux plutôt qu'une par réglage : le serveur n'a alors qu'un seul chemin de
 * lecture-modification-écriture sur `users.settings`, et un nouveau drapeau ne
 * coûte qu'une entrée dans `userSettingFlagSchema`.
 *
 * La sortie renvoie le sac **complet** tel qu'il vient d'être écrit : le client
 * peut s'aligner dessus au lieu de rejouer sa propre arithmétique.
 */
export const userSetSetting = {
    command: 'user.setSetting' as const,
    input: z.object({ flag: userSettingFlagSchema, enabled: z.boolean() }),
    output: z.object({ settings: z.array(z.string()) })
};

export const userCommands = [userSetAvatar, userSetTheme, userSetColor, userSetSetting] as const;
