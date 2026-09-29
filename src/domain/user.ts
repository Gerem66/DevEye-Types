import { z } from 'zod';
import { userRoleSchema } from './role';

/**
 * État d'un compte au niveau du site. `suspended` conserve toutes les données
 * mais refuse la connexion — c'est une révocation réversible, pas une
 * suppression.
 */
export const userStatusSchema = z.enum(['active', 'suspended']);
export type UserStatus = z.infer<typeof userStatusSchema>;

/**
 * Couleur d'identité du compte : son curseur chez les autres, sa bulle dans la
 * barre du haut, la bordure du nœud où il se trouve. Une identité visuelle, donc
 * portée par le compte et non par l'adhésion à un espace.
 *
 * Huit teintes, le cyan exclu — c'est celui de `--accent`, un curseur de cette
 * couleur se lirait comme un élément de l'interface. La valeur est toujours
 * rendue via le jeton `--user-<nom>` (Styles/theme.css), jamais en hexadécimal.
 */
export const userColorSchema = z.enum([
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'indigo',
    'purple',
    'pink'
]);
export type UserColor = z.infer<typeof userColorSchema>;

/** L'ordre fait foi : il est indexé par `defaultUserColor` et en base. */
export const USER_COLORS = userColorSchema.options;

/**
 * Teinte attribuée d'office à un compte depuis son identifiant : deux comptes
 * créés à la suite n'ont pas la même.
 */
export function defaultUserColor(userId: number): UserColor {
    return USER_COLORS[Math.abs(userId) % USER_COLORS.length];
}

/**
 * The account name: what one logs in with, and what the other members see.
 * Unique across the site (`users.username` carries a UNIQUE index), and narrow
 * enough to travel through a URL, a log line or a shell without escaping.
 */
export const usernameSchema = z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'username may only contain letters, digits, _ . -');

export const minimalUserSchema = z.object({
    id: z.number().int().nonnegative(),
    email: z.string().email(),
    username: z.string().min(1),
    avatar: z.string(),
    color: userColorSchema,
    /** Époque Unix de la dernière connexion ; `0` pour un compte jamais venu. */
    lastLogin: z.number().int().nonnegative(),
    created: z.number().int().nonnegative()
});

export type MinimalUser = z.infer<typeof minimalUserSchema>;

/**
 * Account security posture, surfaced in the profile as "Sécurité → x / 3".
 * Each flag is one of the three main protections.
 */
export const userSecuritySchema = z.object({
    /** TOTP two-factor authentication is enabled. */
    twoFactor: z.boolean(),
    /** Password-based encryption (DEK wrapped by the user's password) is on. */
    passwordEncryption: z.boolean(),
    /**
     * Password re-validation window is configured to a strict value: enabled and
     * short enough (≤ 5 min) to count as a protection. Disabled (0) or a long
     * window does not count.
     */
    reAuthValidation: z.boolean()
});

export type UserSecurity = z.infer<typeof userSecuritySchema>;

/**
 * Drapeaux de compte, rangés dans `users.settings` (un sac de chaînes).
 * L'absence d'un drapeau est sa valeur par défaut : aucune migration quand un
 * drapeau apparaît.
 *
 * - `hideLiveCursors` : ne pas afficher les curseurs des autres membres. La
 *   coupure est réciproque : le client cesse aussi d'émettre le sien, on ne
 *   peut pas regarder sans être vu.
 * - `feedbackHintDismissed` : la bulle qui présente le bouton de signalement a
 *   été vue. Posée par sa croix comme par l'ouverture du formulaire, elle ne
 *   se retire jamais : la bulle se montre une fois dans la vie d'un compte.
 * - `homeLayoutHintDismissed`, `aboutHintDismissed` : de même pour les bulles
 *   du bouton d'organisation de l'accueil et du numéro de version.
 */
export const userSettingFlagSchema = z.enum([
    'hideLiveCursors',
    'feedbackHintDismissed',
    'homeLayoutHintDismissed',
    'aboutHintDismissed'
]);
export type UserSettingFlag = z.infer<typeof userSettingFlagSchema>;

export const userSchema = z.object({
    id: z.number().int().nonnegative(),
    email: z.string().email(),
    username: z.string().min(1),
    avatar: z.string(),
    color: userColorSchema,
    role: userRoleSchema,
    /** Les drapeaux posés — voir `userSettingFlagSchema`. Un drapeau inconnu du
     *  client (compte revenu d'une version plus récente) est simplement ignoré,
     *  d'où le tableau de chaînes plutôt qu'un tableau d'énumérés. */
    settings: z.array(z.string()),
    security: userSecuritySchema,
    /** Espace personnel du compte : créé avec lui, toujours présent. */
    personalWorkspaceId: z.number().int().positive(),
    /**
     * Espace « favori », chargé en premier à la connexion et au rechargement.
     * `null` → l'espace personnel. Pointe sur un espace dont le compte est
     * membre ; il repasse à `null` si cet espace disparaît ou si l'accès est
     * révoqué.
     */
    defaultWorkspaceId: z.number().int().positive().nullable(),
    lastLogin: z.number().int().nonnegative(),
    created: z.number().int().nonnegative()
});

export type User = z.infer<typeof userSchema>;

/**
 * Database row shape (server-only). Mirrors columns exactly.
 */
export interface UserRow {
    id: number;
    email: string;
    username: string;
    password_hash: string;
    avatar: string;
    color: UserColor;
    role: string;
    status: UserStatus;
    settings: string;
    /** Espace personnel du compte (FK `workspaces.id`), unique par utilisateur. */
    personal_workspace_id: number;
    /** Espace favori chargé en premier ; `null` → l'espace personnel. */
    default_workspace_id: number | null;
    re_auth_interval: number | null;
    last_login: number;
    created: number;
    /** Seconds. When the terms of use were accepted at sign-up; `null` for an account created without a site. */
    terms_accepted_at: number | null;
    /** The end-to-end run that created this throwaway account (`<instance tag>-<run id>`); `null` for a person. */
    e2e_run: string | null;
}
