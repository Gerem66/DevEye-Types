import { z } from 'zod';
import { homeLayoutSchema } from '../domain/home';
import { userSchema } from '../domain/user';
import { workspaceSchema } from '../domain/workspace';
import { workspacePermissionsSchema } from '../domain/workspaceRole';
import { themeStateSchema } from '../features/user';

/**
 * Contenu commun à `/login`, `/refresh` et `/me` : le compte, ses espaces, et
 * le thème et la disposition d'accueil de l'espace actif seul. Les thèmes des
 * autres espaces ne sont pas embarqués : `bgImages` peut porter plusieurs data
 * URLs, et les livrer tous multiplierait la charge utile par le nombre
 * d'espaces.
 */
export const sessionBundleSchema = z.object({
    user: userSchema,
    workspaces: z.array(workspaceSchema),
    /** Espace chargé à l'ouverture : le favori s'il est encore accessible, sinon le personnel. */
    activeWorkspaceId: z.number().int().positive(),
    theme: themeStateSchema.nullable(),
    homeLayout: homeLayoutSchema.nullable(),
    /** Droits de l'appelant dans l'espace actif, pour que l'UI masque le reste. */
    permissions: workspacePermissionsSchema,
    /**
     * Ce serveur accepte-t-il les signalements (`FEEDBACK_ENABLED`) ? Porté par
     * le bundle plutôt que par une requête à part : le client doit le savoir
     * avant son premier rendu, pour ne pas faire clignoter le bouton.
     */
    feedbackEnabled: z.boolean()
});

export type SessionBundle = z.infer<typeof sessionBundleSchema>;

export const loginRequestSchema = z.object({
    username: z.string().min(1).max(120),
    password: z.string().min(1).max(512)
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** L'inscription exige un jeton d'invitation émis par un administrateur. */
export const registerRequestSchema = z.object({
    inviteToken: z.string().min(1),
    username: z
        .string()
        .min(3)
        .max(64)
        .regex(/^[a-zA-Z0-9_.-]+$/, 'username may only contain letters, digits, _ . -'),
    email: z.string().email().max(320),
    password: z.string().min(8).max(512)
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const changePasswordRequestSchema = z.object({
    currentPassword: z.string().min(1).max(512),
    newPassword: z.string().min(8).max(512)
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

export const changePasswordResponseSchema = z.object({ changed: z.literal(true) });

export type ChangePasswordResponse = z.infer<typeof changePasswordResponseSchema>;

/**
 * The auth flow returns the authenticated user and its workspaces in one shot.
 * Tokens are delivered as HttpOnly cookies, never in the JSON body.
 *
 * When 2FA is enabled, login first replies with `twoFactorRequired` and an
 * interim challenge token (cookie); the client then posts a TOTP/backup code.
 */
export const loginResponseSchema = z.discriminatedUnion('twoFactorRequired', [
    sessionBundleSchema.extend({ twoFactorRequired: z.literal(false) }),
    z.object({ twoFactorRequired: z.literal(true) })
]);

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const twoFactorChallengeRequestSchema = z.object({
    /** A 6-digit TOTP code or a recovery backup code. */
    code: z.string().min(6).max(16)
});

export type TwoFactorChallengeRequest = z.infer<typeof twoFactorChallengeRequestSchema>;

export const refreshResponseSchema = sessionBundleSchema;

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const meResponseSchema = sessionBundleSchema;

export type MeResponse = z.infer<typeof meResponseSchema>;
