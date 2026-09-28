import { z } from 'zod';
import { usernameSchema, userColorSchema, userSettingFlagSchema } from '../domain/user';

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
 * Upper bound on one saved slot value (a compressed data URL or a short raw
 * URL): a safety cap keeping the whole theme JSON (5 slots + active image)
 * within the browser's localStorage budget and the theme column.
 */
export const THEME_SLOT_IMAGE_MAX_LENGTH = 1_500_000;

/**
 * A wallpaper value: an image data URL, or an https URL. The theme belongs to
 * the workspace, so every member's browser loads what one member saved: a free
 * string would let `http:` or any other scheme through to all of them.
 */
const THEME_IMAGE =
    /^(data:image\/(png|jpeg|webp|avif|gif);base64,[A-Za-z0-9+/]+=*|https:\/\/[^\s"'()\\]+)$/;

export const themeStateSchema = z.object({
    /** A hex colour: it is written as-is into CSS custom properties on every member's page. */
    accent: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .nullable(),
    bgPreset: z.string().max(40).nullable(),
    bgImage: z.string().max(THEME_IMAGE_MAX_LENGTH).regex(THEME_IMAGE).nullable(),
    /**
     * Saved background gallery: up to THEME_SLOT_COUNT slots, each a compressed
     * data URL / raw URL, or null for an empty slot. Defaults to empty so themes
     * saved before this field parse cleanly.
     */
    bgImages: z
        .array(z.string().max(THEME_SLOT_IMAGE_MAX_LENGTH).regex(THEME_IMAGE).nullable())
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
 * Pose ou retire un drapeau de compte. Une commande pour tous les drapeaux :
 * un seul chemin lecture-modification-écriture sur `users.settings`. La sortie
 * renvoie le sac complet tel qu'il vient d'être écrit.
 */
export const userSetSetting = {
    command: 'user.setSetting' as const,
    input: z.object({ flag: userSettingFlagSchema, enabled: z.boolean() }),
    output: z.object({ settings: z.array(z.string()) })
};

/**
 * Renames the account. Same rule as registration (`usernameSchema`), and the
 * same uniqueness: the server rejects a name another account already holds.
 */
export const userSetUsername = {
    command: 'user.setUsername' as const,
    input: z.object({ username: usernameSchema }),
    output: z.object({ username: usernameSchema })
};

/** The plan of an account, as a plan provider states it (`sdk/providers.ts`). */
export const accountPlanSchema = z.object({
    id: z.string(),
    label: z.string(),
    limits: z.record(z.string(), z.number().int().nonnegative()),
    priority: z.boolean(),
    trialEndsAt: z.number().int().nonnegative().optional(),
    changesAt: z.number().int().nonnegative().optional()
});

/**
 * The caller's plan. `null`: this DevEye has no plan provider, everything is
 * unlimited. `paused`: how many of the caller's items the plan holds paused,
 * by `<featureId>.<quotaKey>`, only the keys that have some.
 */
export const userPlan = {
    command: 'user.plan' as const,
    input: z.object({}),
    output: z.object({
        plan: accountPlanSchema.nullable(),
        paused: z.record(z.string(), z.number().int().positive())
    })
};

/**
 * Deletes the caller's account with everything it owns: the personal workspace,
 * the shared workspaces it owns and their content. Modules are told first
 * (`FeatureService.onAccountDeleted`), so a subscription ends with the account.
 * The password is asked again: the session alone is not enough for this.
 */
export const userDeleteAccount = {
    command: 'user.deleteAccount' as const,
    input: z.object({ password: z.string().min(1).max(512) }),
    output: z.object({ ok: z.literal(true) })
};

/** A part of the data export made of large files, for the dialog. */
export const userExportPartSchema = z.object({
    /** `<featureId>.<filesKey>`: what `leaveOut` names. */
    key: z.string(),
    /** In French, as the dialog names it: « les fichiers CloudSync ». */
    label: z.string(),
    bytes: z.number().int().nonnegative(),
    /** The holder may leave it out. */
    optional: z.boolean()
});
export type UserExportPart = z.infer<typeof userExportPartSchema>;

/** What an export of the caller's data will carry, for the dialog. No password: sizes only. */
export const userExportPreview = {
    command: 'user.exportPreview' as const,
    input: z.object({}),
    output: z.object({
        parts: z.array(userExportPartSchema),
        /** Shared workspaces the caller belongs to without owning them: listed in the archive, not exported. */
        foreignWorkspaces: z.number().int().nonnegative()
    })
};

/**
 * Checks the password and hands back a single-use link, valid five minutes, to
 * the caller's data export: a zip the server writes while it is downloaded,
 * never stored. Everything in it is in the clear, password-protected data
 * included. `leaveOut` names optional parts (`userExportPreview`).
 */
export const userExportPrepare = {
    command: 'user.exportPrepare' as const,
    input: z.object({
        password: z.string().min(1).max(512),
        leaveOut: z.array(z.string().max(64)).max(16)
    }),
    output: z.object({
        /** Relative to this instance's origin, fetched with its cookie. */
        url: z.string(),
        /** Milliseconds: the link is dead after this. */
        expiresAt: z.number().int().nonnegative()
    })
};

export const userCommands = [
    userDeleteAccount,
    userExportPreview,
    userExportPrepare,
    userPlan,
    userSetAvatar,
    userSetTheme,
    userSetColor,
    userSetSetting,
    userSetUsername
] as const;
