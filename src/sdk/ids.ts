/**
 * Feature ids, re-exported for SDK consumers.
 *
 * DevEye has two id families sharing one namespace:
 *  - the sixteen **native** feature ids, a closed enum (`WorkspaceFeatureId`);
 *  - **external** module ids, `x-<slug>` strings matching
 *    {@link EXTERNAL_FEATURE_ID_PATTERN}.
 *
 * The `x-` prefix guarantees, by construction, that an external id can never
 * collide with a native feature, a reserved live topic, or a device UUID in a
 * home layout. Your module's id is also its command prefix (`x-crypto.list`)
 * and its live topic.
 */
export {
    EXTERNAL_FEATURE_ID_PATTERN,
    externalFeatureIdSchema,
    featureIdSchema,
    isExternalFeatureId,
    workspaceFeatureIdSchema,
    type ExternalFeatureId,
    type FeatureId,
    type WorkspaceFeatureId
} from '../domain/workspaceRole';

export { featureAccessSchema, type FeatureAccess } from '../domain/workspaceRole';
