import { z } from 'zod';

/**
 * Maintenance, site-wide or per feature, set by the global admin (or by the
 * database and the `MAINTENANCE` variable when the interface is out of reach).
 *
 * A feature has three levels: `requests` refuses every non-admin command and
 * public route while its background service keeps running; `preview` refuses
 * the same, but hides the feature from non-admins instead of greying it out
 * (a feature admins try out in production before opening it); `full` also
 * stops the service, and refuses admins too, the feature no longer being able
 * to answer.
 */

export const featureMaintenanceLevelSchema = z.enum(['requests', 'preview', 'full']);
export type FeatureMaintenanceLevel = z.infer<typeof featureMaintenanceLevelSchema>;

/** What every client of a server knows: enough to eject, grey out and redirect. */
export const maintenanceStateSchema = z.object({
    site: z.boolean(),
    /** The text shown to everyone the site maintenance keeps out. */
    message: z.string(),
    /** Features under maintenance only; an absent id is open. */
    features: z.record(z.string(), featureMaintenanceLevelSchema),
    /**
     * Accounts whose plan has `priority` are served first: the others stay
     * signed in, with everything they run paused. Defaults for a remote
     * instance on an older version.
     */
    priority: z.boolean().default(false)
});
export type MaintenanceState = z.infer<typeof maintenanceStateSchema>;

/** `GET /api/maintenance`: what an anonymous visitor may learn, without a session. */
export const publicMaintenanceSchema = maintenanceStateSchema.pick({ site: true, message: true });
export type PublicMaintenance = z.infer<typeof publicMaintenanceSchema>;

/** Server push carrying the whole {@link MaintenanceState}, to every socket, on each change. */
export const MAINTENANCE_EVENT = 'maintenance.state';

/**
 * WebSocket close code for an account the site maintenance keeps out. The client
 * stops its reconnection backoff: the server refuses again until the end.
 */
export const MAINTENANCE_CLOSE_CODE = 4503;

/** Upper bound of the site message, on input and in the database. */
export const MAINTENANCE_MESSAGE_MAX = 1000;

/**
 * The `session` frame that opens every socket. `maintenance` is optional: a
 * remote instance on an older version does not send it.
 */
export const sessionFrameSchema = z.object({
    userId: z.number().int().positive(),
    maintenance: maintenanceStateSchema.optional()
});
export type SessionFrame = z.infer<typeof sessionFrameSchema>;
