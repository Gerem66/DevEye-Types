import { z } from 'zod';
import { homeLayoutSchema } from '../domain/home';
import { usernameSchema, userSchema } from '../domain/user';
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

/** A password being chosen: the one account policy, at sign-up and at change. */
export const passwordSchema = z.string().min(8).max(512);

export const changePasswordRequestSchema = z.object({
    currentPassword: z.string().min(1).max(512),
    newPassword: passwordSchema
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
    code: z.string().min(6).max(24)
});

export type TwoFactorChallengeRequest = z.infer<typeof twoFactorChallengeRequestSchema>;

export const refreshResponseSchema = sessionBundleSchema;

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const meResponseSchema = sessionBundleSchema;

export type MeResponse = z.infer<typeof meResponseSchema>;

/**
 * Self-service sign-up, in three steps: ask (`/signup`), open the mailed link
 * (`/signup/verify`), choose a password (`/signup/complete`). No account exists
 * before the last one.
 */
export const signupAvailabilitySchema = z.object({
    /** Can an account be self-created here: the server allows it, or no account exists yet. */
    open: z.boolean()
});

export type SignupAvailability = z.infer<typeof signupAvailabilitySchema>;

export const signupStartRequestSchema = z.object({
    username: usernameSchema,
    email: z.string().email().max(320),
    /** Opaque hint carried to the first session (`signupPlan`), for whoever sent the visitor. */
    plan: z
        .string()
        .regex(/^[a-z0-9_-]{1,64}$/)
        .optional()
});

export type SignupStartRequest = z.infer<typeof signupStartRequestSchema>;

export const signupStartResponseSchema = z.object({
    /** Lets the asking tab follow the request (`X-Signup-Watch`). It is NOT the mailed token. */
    watchToken: z.string()
});

export type SignupStartResponse = z.infer<typeof signupStartResponseSchema>;

export const signupStatusSchema = z.object({
    /** `opened`: the mailed link was followed. An unknown watch token reads `pending`. */
    state: z.enum(['pending', 'opened', 'done', 'expired'])
});

export type SignupStatus = z.infer<typeof signupStatusSchema>;

export const signupVerifyRequestSchema = z.object({ token: z.string().min(1).max(128) });

export type SignupVerifyRequest = z.infer<typeof signupVerifyRequestSchema>;

export const signupVerifyResponseSchema = z.object({ username: z.string(), email: z.string() });

export type SignupVerifyResponse = z.infer<typeof signupVerifyResponseSchema>;

export const signupCompleteRequestSchema = z.object({
    token: z.string().min(1).max(128),
    password: passwordSchema
});

export type SignupCompleteRequest = z.infer<typeof signupCompleteRequestSchema>;

export const signupCompleteResponseSchema = sessionBundleSchema.extend({
    /** The `plan` hint given at the first step, delivered once. */
    signupPlan: z.string().nullable()
});

export type SignupCompleteResponse = z.infer<typeof signupCompleteResponseSchema>;
