import { z } from 'zod';
import { minimalUserSchema } from './user';

/**
 * Nature d'un espace.
 *
 * - `personal` : créé avec le compte, un seul membre (son propriétaire), ni
 *   quittable ni supprimable, jamais partageable. C'est le repli implicite quand
 *   une commande ne vise aucun espace en particulier.
 * - `shared` : créé à la demande, plusieurs membres, rôles et invitations.
 *
 * Les deux sont de vraies lignes de `workspaces` : il n'existe plus d'espace
 * virtuel d'id 0.
 */
export const workspaceKindSchema = z.enum(['personal', 'shared']);
export type WorkspaceKind = z.infer<typeof workspaceKindSchema>;

export const workspaceSchema = z.object({
    id: z.number().int().positive(),
    kind: workspaceKindSchema,
    name: z.string().min(1),
    logo: z.string(),
    /** Propriétaire : tous les droits, ne peut être ni exclu ni rétrogradé. */
    ownerUserId: z.number().int().positive(),
    users: z.array(minimalUserSchema),
    features: z.array(z.string().min(1)),
    created: z.number().int().nonnegative()
});

export type Workspace = z.infer<typeof workspaceSchema>;

/**
 * Ligne SQL (serveur uniquement). `theme` et `home_layout` sont portés par
 * l'espace, pas par l'utilisateur : chaque espace a sa propre apparence et sa
 * propre disposition d'accueil.
 */
export interface WorkspaceRow {
    id: number;
    kind: WorkspaceKind;
    name: string;
    logo: string;
    owner_user_id: number;
    features: string;
    /** ThemeStateDTO sérialisé, ou null tant qu'aucun thème n'a été enregistré. */
    theme: string | null;
    /** HomeLayout sérialisé, ou null tant qu'aucune disposition n'a été enregistrée. */
    home_layout: string | null;
    created: number;
}

export interface WorkspaceMemberRow {
    id: number;
    user_id: number;
    workspace_id: number;
    date: number;
}

/** Invitation à rejoindre un espace, telle que la voit le client. */
export const workspaceInviteSchema = z.object({
    token: z.string().min(1),
    /** Lien complet à transmettre, construit à partir de `PUBLIC_ORIGIN`. */
    url: z.string().min(1),
    expiresAt: z.number().int().nullable(),
    maxUses: z.number().int().positive().nullable(),
    uses: z.number().int().nonnegative(),
    createdBy: z.string(),
    created: z.number().int().nonnegative()
});

export type WorkspaceInvite = z.infer<typeof workspaceInviteSchema>;

export interface WorkspaceInviteRow {
    token: string;
    workspace_id: number;
    created_by: number;
    expires_at: number | null;
    max_uses: number | null;
    uses: number;
    revoked_at: number | null;
    created: number;
}
