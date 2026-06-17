import { z } from 'zod';

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

export const themeStateSchema = z.object({
    accent: z.string().nullable(),
    bgPreset: z.string().nullable(),
    bgImage: z.string().max(THEME_IMAGE_MAX_LENGTH).nullable(),
    bgDim: z.number().int().min(0).max(100),
    bgBlur: z.boolean()
});

export type ThemeStateDTO = z.infer<typeof themeStateSchema>;

export const userSetTheme = {
    command: 'user.setTheme' as const,
    input: themeStateSchema,
    output: z.object({ ok: z.literal(true) })
};

export const userCommands = [userSetAvatar, userSetTheme] as const;
