import { z } from 'zod';
import { homeLayoutSchema } from '../domain/home';
import { remoteInstanceSchema } from '../domain/remoteInstance';
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
    /** Les instances distantes du compte, dans l'ordre du menu. Leurs espaces se lisent là-bas. */
    remoteInstances: z.array(remoteInstanceSchema),
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

/**
 * The tokens of a federated session: one opened by the page of ANOTHER DevEye
 * instance, whose origin this server lists in `FEDERATION_ORIGINS`. Such a page
 * cannot hold this server's cookies, so it carries the tokens itself: the access
 * token as `Authorization: Bearer`, the refresh token in the body of `/refresh`.
 */
export const sessionTokensSchema = z.object({
    access: z.string(),
    refresh: z.string(),
    /** Lifetime of `access`, so the page can renew it before it lapses. */
    accessTtlSeconds: z.number().int().positive()
});

export type SessionTokens = z.infer<typeof sessionTokensSchema>;

/** A password being chosen: the one account policy, at sign-up and at change. */
export const passwordSchema = z.string().min(8).max(512);

export const changePasswordRequestSchema = z.object({
    currentPassword: z.string().min(1).max(512),
    newPassword: passwordSchema
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

export const changePasswordResponseSchema = z.object({
    changed: z.literal(true),
    /** The renewed tokens of a federated session. */
    tokens: sessionTokensSchema.optional()
});

export type ChangePasswordResponse = z.infer<typeof changePasswordResponseSchema>;

/**
 * The auth flow returns the authenticated user and its workspaces in one shot.
 * Tokens are delivered as HttpOnly cookies, never in the JSON body, except to a
 * federated origin (`tokens`, see {@link sessionTokensSchema}).
 *
 * When 2FA is enabled, login first replies with `twoFactorRequired` and an
 * interim challenge token (a cookie, or `challenge` for a federated origin); the
 * client then posts a TOTP/backup code.
 */
export const loginResponseSchema = z.discriminatedUnion('twoFactorRequired', [
    sessionBundleSchema.extend({
        twoFactorRequired: z.literal(false),
        tokens: sessionTokensSchema.optional()
    }),
    z.object({ twoFactorRequired: z.literal(true), challenge: z.string().optional() })
]);

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const twoFactorChallengeRequestSchema = z.object({
    /** A 6-digit TOTP code or a recovery backup code. */
    code: z.string().min(6).max(24),
    /** The challenge handed by `/login`, from a federated origin (no cookie holds it there). */
    challenge: z.string().max(2048).optional()
});

export type TwoFactorChallengeRequest = z.infer<typeof twoFactorChallengeRequestSchema>;

/** Body of `/refresh` and `/logout` from a federated origin; a same-origin page sends none. */
export const refreshRequestSchema = z.object({ refreshToken: z.string().max(2048) });

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const refreshResponseSchema = sessionBundleSchema.extend({
    tokens: sessionTokensSchema.optional()
});

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

/**
 * `POST /api/auth/ws-ticket`: what a federated page opens the socket with
 * (`/ws?ticket=`), a browser being unable to set a header on a WebSocket.
 * Seconds-lived and single-use.
 */
export const wsTicketResponseSchema = z.object({ ticket: z.string() });

export type WsTicketResponse = z.infer<typeof wsTicketResponseSchema>;

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
