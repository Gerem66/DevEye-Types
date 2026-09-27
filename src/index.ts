export { clientMessageSchema, serverMessageSchema } from './protocol/envelope';
export type { ClientMessage, ConnectionState, ServerMessage } from './protocol/envelope';
export { ErrorCodeSchema, ProtocolErrorSchema } from './protocol/error';
export type { ErrorCode, ProtocolError } from './protocol/error';
export { err, ok, resultSchema } from './protocol/result';
export type { Result } from './protocol/result';
export { PROTOCOL_VERSION } from './protocol/version';
export type { ProtocolVersion } from './protocol/version';
export {
    AGENT_ACK,
    AGENT_AUTH_EVENTS,
    AGENT_CLOSE_PENDING_APPROVAL,
    AGENT_COLLECT,
    AGENT_CONFIG,
    AGENT_DESTROY,
    AGENT_DESTROYED,
    AGENT_ERROR,
    AGENT_FILES_ANALYZE,
    AGENT_FILES_ARCHIVE,
    AGENT_FILES_ARCHIVE_CANCEL,
    AGENT_FILES_ARCHIVE_CHUNK,
    AGENT_FILES_ARCHIVE_CREDIT,
    AGENT_FILES_ARCHIVE_END,
    AGENT_FILES_ARCHIVE_PROGRESS,
    AGENT_FILES_CHUNK,
    AGENT_FILES_DOWNLOAD,
    AGENT_FILES_LIST,
    AGENT_FILES_LISTING,
    AGENT_FILES_MATCHES,
    AGENT_FILES_MUTATE,
    AGENT_FILES_OP_RESULT,
    AGENT_FILES_SEARCH,
    AGENT_FILES_UPLOAD,
    AGENT_FILES_USAGE,
    AGENT_FOLDER_ARCHIVE_PROBE,
    AGENT_HELLO,
    AGENT_INTEGRITY,
    AGENT_LIFECYCLE,
    AGENT_LOG_LINES,
    AGENT_LOG_QUERY,
    AGENT_LOG_SOURCES,
    AGENT_DOCKER_ACTION,
    AGENT_DOCKER_DONE,
    AGENT_DOCKER_INVENTORY,
    AGENT_DOCKER_INVENTORY_RESULT,
    AGENT_DOCKER_PROGRESS,
    AGENT_DOCKER_STATS,
    AGENT_DOCKER_STATS_RESULT,
    AGENT_LOG_SOURCES_RESULT,
    AGENT_METRICS_BATCH,
    AGENT_PKG_DONE,
    AGENT_PKG_LIST,
    AGENT_PKG_LIST_RESULT,
    AGENT_PKG_PROGRESS,
    AGENT_PKG_UPGRADE,
    AGENT_POWER,
    AGENT_POWER_RESULT,
    AGENT_REPORT,
    AGENT_SCAN,
    AGENT_SERVICE,
    AGENT_SERVICE_RESULT,
    AGENT_SYNC_ACK,
    AGENT_SYNC_APPLY_CHUNK,
    AGENT_SYNC_APPLY_DIR,
    AGENT_SYNC_APPLY_START,
    AGENT_SYNC_APPLY_LOCAL,
    AGENT_SYNC_CHANGED,
    AGENT_SYNC_CHUNK,
    AGENT_SYNC_CONFIG,
    AGENT_SYNC_DELETE,
    AGENT_SYNC_MOVE,
    AGENT_SYNC_INDEX,
    AGENT_SYNC_OP_RESULT,
    AGENT_SYNC_PUSH,
    AGENT_SYNC_SCAN,
    AGENT_TERM_CLOSE,
    AGENT_TERM_EXIT,
    AGENT_TERM_INPUT,
    AGENT_TERM_OPEN,
    AGENT_TERM_OUTPUT,
    AGENT_TERM_RESIZE,
    AGENT_UPDATE,
    AGENT_UPDATED,
    agentClientMessageSchema,
    agentConfigPayloadSchema,
    agentDestroyedMessagePayloadSchema,
    agentFilesAnalyzePayloadSchema,
    agentFilesArchiveCancelPayloadSchema,
    agentFilesArchiveChunkPayloadSchema,
    agentFilesArchiveCreditPayloadSchema,
    agentFilesArchiveEndPayloadSchema,
    agentFilesArchivePayloadSchema,
    agentFilesArchiveProgressPayloadSchema,
    agentFilesChunkPayloadSchema,
    agentFilesDownloadPayloadSchema,
    agentFilesListPayloadSchema,
    agentFilesListingPayloadSchema,
    agentFilesMatchesPayloadSchema,
    agentFilesMutatePayloadSchema,
    agentFilesOpResultPayloadSchema,
    agentFilesSearchPayloadSchema,
    agentFilesUploadPayloadSchema,
    agentFilesUsagePayloadSchema,
    agentLifecycleActionSchema,
    agentLifecyclePayloadSchema,
    agentLogLinesPayloadSchema,
    agentLogQueryPayloadSchema,
    agentDockerActionPayloadSchema,
    agentDockerDonePayloadSchema,
    agentDockerInventoryResultPayloadSchema,
    agentDockerProgressPayloadSchema,
    agentDockerStatsResultPayloadSchema,
    agentLogSourcesResultPayloadSchema,
    agentPkgDonePayloadSchema,
    agentPkgListResultPayloadSchema,
    agentPkgProgressPayloadSchema,
    agentPkgUpgradePayloadSchema,
    agentPowerActionSchema,
    agentPowerPayloadSchema,
    agentPowerResultPayloadSchema,
    agentAuthEventsMessagePayloadSchema,
    agentIntegrityMessagePayloadSchema,
    agentReportMessagePayloadSchema,
    agentServerMessageSchema,
    agentServiceActionSchema,
    agentServicePayloadSchema,
    agentServiceResultPayloadSchema,
    agentSyncAckPayloadSchema,
    agentSyncApplyChunkPayloadSchema,
    agentSyncApplyDirPayloadSchema,
    agentSyncApplyStartPayloadSchema,
    agentSyncApplyLocalPayloadSchema,
    agentSyncChangedPayloadSchema,
    agentSyncChunkPayloadSchema,
    agentSyncConfigPayloadSchema,
    agentSyncDeletePayloadSchema,
    agentSyncMovePayloadSchema,
    agentSyncIndexPayloadSchema,
    agentSyncOpResultPayloadSchema,
    agentSyncPushPayloadSchema,
    agentSyncScanPayloadSchema,
    agentTermClosePayloadSchema,
    agentTermExitPayloadSchema,
    agentTermInputPayloadSchema,
    agentTermOpenPayloadSchema,
    agentTermOutputPayloadSchema,
    agentTermResizePayloadSchema,
    agentUpdatedMessagePayloadSchema,
    agentUpdatePayloadSchema,
    CLOUD_SYNC_CHUNK_EVENT,
    CLOUD_SYNC_PROGRESS_EVENT,
    CLOUD_SYNC_STATE_EVENT,
    cloudSyncChunkPushSchema,
    cloudSyncProgressPushSchema,
    cloudSyncStatePushSchema,
    DEVICE_FILES_CHUNK_EVENT,
    DEVICE_FILES_LISTING_EVENT,
    DEVICE_FILES_MATCHES_EVENT,
    DEVICE_FILES_OP_EVENT,
    DEVICE_FILES_USAGE_EVENT,
    DEVICE_LOG_LINES_EVENT,
    DEVICE_DOCKER_DONE_EVENT,
    DEVICE_DOCKER_INVENTORY_EVENT,
    DEVICE_DOCKER_PROGRESS_EVENT,
    DEVICE_DOCKER_STATS_EVENT,
    DEVICE_LOG_SOURCES_EVENT,
    DEVICE_POWER_EVENT,
    DEVICE_PRESENCE_EVENT,
    DEVICE_REPORT_EVENT,
    DEVICE_SERVICE_EVENT,
    DEVICE_TERM_EXIT_EVENT,
    DEVICE_TERM_OUTPUT_EVENT,
    deviceFilesChunkPushSchema,
    deviceFilesListingPushSchema,
    deviceFilesMatchesPushSchema,
    deviceFilesOpPushSchema,
    deviceFilesUsagePushSchema,
    deviceLogLinesPushSchema,
    deviceDockerDonePushSchema,
    deviceDockerInventoryPushSchema,
    deviceDockerProgressPushSchema,
    deviceDockerStatsPushSchema,
    deviceLogSourcesPushSchema,
    devicePowerPushSchema,
    devicePresenceSchema,
    deviceReportPushSchema,
    deviceServicePushSchema,
    deviceTermExitPushSchema,
    deviceTermOutputPushSchema,
    METRICS_PUSH_EVENT,
    metricsPushSchema,
    PACKAGE_DONE_EVENT,
    PACKAGE_LIST_EVENT,
    PACKAGE_PROGRESS_EVENT,
    PACKAGE_STARTED_EVENT,
    packageDonePushSchema,
    packageListPushSchema,
    packageProgressPushSchema,
    packageStartedPushSchema,
    AGENT_TOKEN_ROTATE,
    agentTokenRotatePayloadSchema,
    orderSignatureSchema,
    SIGNED_AGENT_COMMANDS,
    syncIndexEntrySchema,
    syncShareAssignmentSchema
} from './protocol/agent';
export type {
    AgentClientMessage,
    AgentConfigPayload,
    AgentTokenRotatePayload,
    OrderSignature,
    AgentFilesAnalyzePayload,
    AgentFilesArchiveCancelPayload,
    AgentFilesArchiveChunkPayload,
    AgentFilesArchiveCreditPayload,
    AgentFilesArchiveEndPayload,
    AgentFilesArchivePayload,
    AgentFilesArchiveProgressPayload,
    AgentFilesDownloadPayload,
    AgentFilesListPayload,
    AgentFilesMutatePayload,
    AgentFilesSearchPayload,
    AgentFilesUploadPayload,
    AgentLifecycleAction,
    AgentLifecyclePayload,
    AgentLogQueryPayload,
    AgentPkgUpgradePayload,
    AgentPowerAction,
    AgentPowerPayload,
    AgentServerMessage,
    AgentServiceAction,
    AgentServicePayload,
    AgentSyncAckPayload,
    AgentSyncApplyChunkPayload,
    AgentSyncApplyDirPayload,
    AgentSyncApplyStartPayload,
    AgentSyncApplyLocalPayload,
    AgentSyncChangedPayload,
    AgentSyncChunkPayload,
    AgentSyncConfigPayload,
    AgentSyncDeletePayload,
    AgentSyncIndexPayload,
    AgentSyncMovePayload,
    AgentSyncOpResultPayload,
    AgentSyncPushPayload,
    AgentSyncScanPayload,
    AgentTermClosePayload,
    AgentTermInputPayload,
    AgentTermOpenPayload,
    AgentTermResizePayload,
    AgentUpdatePayload,
    CloudSyncChunkPush,
    CloudSyncProgressPush,
    CloudSyncStatePush,
    DeviceFilesChunkPush,
    DeviceFilesListingPush,
    DeviceFilesMatchesPush,
    DeviceFilesOpPush,
    DeviceFilesUsagePush,
    DeviceLogLinesPush,
    AgentDockerActionPayload,
    DeviceDockerDonePush,
    DeviceDockerInventoryPush,
    DeviceDockerProgressPush,
    DeviceDockerStatsPush,
    DeviceLogSourcesPush,
    DevicePowerPush,
    DevicePresence,
    DeviceReportPush,
    DeviceServicePush,
    DeviceTermExitPush,
    DeviceTermOutputPush,
    MetricsPush,
    PackageDonePush,
    PackageListPush,
    PackageProgressPush,
    PackageStartedPush,
    SyncIndexEntry,
    SyncShareAssignment
} from './protocol/agent';

export {
    LOG_CATEGORIES,
    LOG_LEVEL_NAMES,
    LOG_LEVELS,
    logEntrySchema,
    logLevelName,
    logLevelNameSchema,
    logLevelValue,
    logSourceSchema
} from './domain/logs';
export type { LogCategory, LogEntry, LogLevelName, LogRow, LogSource } from './domain/logs';
export {
    FEEDBACK_ERRORS_KEPT,
    FEEDBACK_MESSAGE_MAX,
    FEEDBACK_REQUESTS_KEPT,
    FEEDBACK_VIEWS_KEPT,
    feedbackEntrySchema,
    feedbackErrorTraceSchema,
    feedbackKindSchema,
    feedbackRequestTraceSchema,
    feedbackSnapshotSchema,
    feedbackStatusSchema,
    feedbackViewTraceSchema
} from './domain/feedback';
export type {
    FeedbackEntry,
    FeedbackErrorTrace,
    FeedbackKind,
    FeedbackRequestTrace,
    FeedbackRow,
    FeedbackSnapshot,
    FeedbackStatus,
    FeedbackViewTrace
} from './domain/feedback';
export {
    featureMaintenanceLevelSchema,
    MAINTENANCE_CLOSE_CODE,
    MAINTENANCE_EVENT,
    MAINTENANCE_MESSAGE_MAX,
    maintenanceStateSchema,
    publicMaintenanceSchema,
    sessionFrameSchema
} from './domain/maintenance';
export type {
    FeatureMaintenanceLevel,
    MaintenanceState,
    PublicMaintenance,
    SessionFrame
} from './domain/maintenance';
export {
    DEVICE_LOG_LEVELS,
    DEVICE_LOG_OFFSET_MAX,
    DEVICE_LOG_PAGE_DEFAULT,
    DEVICE_LOG_PAGE_MAX,
    deviceLogAnchorSchema,
    deviceLogFilterSchema,
    deviceLogLevelSchema,
    deviceLogLineSchema,
    deviceLogSourceKindSchema,
    deviceLogSourceSchema
} from './domain/deviceLogs';
export {
    containerEngineSchema,
    containerStateSchema,
    DOCKER_LONG_ACTIONS,
    DOCKER_UNTARGETED_ACTIONS,
    dockerActionSchema,
    dockerContainerSchema,
    dockerEngineStatusSchema,
    dockerImageSchema,
    dockerInventorySchema,
    dockerNetworkSchema,
    dockerStatSchema,
    dockerVolumeSchema,
    isLongDockerAction,
    isUntargetedDockerAction
} from './domain/deviceDocker';
export type {
    ContainerEngine,
    ContainerState,
    DockerAction,
    DockerContainer,
    DockerEngineStatus,
    DockerImage,
    DockerInventory,
    DockerNetwork,
    DockerStat,
    DockerVolume
} from './domain/deviceDocker';
export {
    cloudSyncProgressSchema,
    cloudSyncShareStateSchema,
    cloudSyncShareStatsSchema,
    sha256HexSchema,
    SYNC_CHUNK_MAX,
    SYNC_FINGERPRINT_SEP,
    SYNC_INDEX_BATCH_MAX,
    SYNC_REL_PATH_MAX,
    SYNC_STORAGE_PATH_MAX,
    syncDirectionSchema,
    syncEntryKindSchema,
    syncIndexFingerprintSchema,
    syncScanModeSchema,
    syncSessionStateSchema,
    syncShareStatusSchema
} from './domain/syncProtocol';
export {
    PATH_EXCLUSION_PATTERN_MAX,
    PATH_EXCLUSION_SUGGESTIONS,
    pathExclusionKindSchema,
    pathExclusionProblem,
    pathExclusionSchema
} from './domain/pathExclusions';
export type { PathExclusion, PathExclusionKind } from './domain/pathExclusions';
export type {
    CloudSyncProgress,
    CloudSyncShareState,
    CloudSyncShareStats,
    SyncDirection,
    SyncEntryKind,
    SyncScanMode,
    SyncSessionState,
    SyncShareStatus
} from './domain/syncProtocol';
export type {
    DeviceLogAnchor,
    DeviceLogFilter,
    DeviceLogLevel,
    DeviceLogLine,
    DeviceLogSource,
    DeviceLogSourceKind
} from './domain/deviceLogs';
export {
    FILE_SEARCH_MAX,
    fileEntrySchema,
    fileKindSchema,
    fileListingSchema,
    fileMatchSchema,
    fileMutateOpSchema,
    fileSearchFieldSchema,
    fileSearchFilterSchema,
    fileUsageEntrySchema
} from './domain/deviceFiles';
export type {
    FileEntry,
    FileKind,
    FileListing,
    FileMatch,
    FileMutateOp,
    FileSearchField,
    FileSearchFilter,
    FileUsageEntry
} from './domain/deviceFiles';
export {
    itemProjectGroupSchema,
    itemProjectSchema,
    itemProjectsBlockerSchema,
    itemProjectsStateSchema,
    projectStatusSchema,
    PROJECT_STATUS_LABELS
} from './domain/project';
export type {
    ItemProject,
    ItemProjectGroup,
    ItemProjectsBlocker,
    ItemProjectsState,
    ProjectStatus
} from './domain/project';
export { presenceEventSchema } from './domain/presence';
export type { PresenceEvent, PresenceRow } from './domain/presence';
export { userRoleSchema } from './domain/role';
export type { UserRole } from './domain/role';
export {
    homeFeatureIdSchema,
    nativeHomeFeatureIdSchema,
    homeFolderSchema,
    homeLayoutSchema,
    homeSectionSchema,
    homeTileId,
    homeTileKind,
    homeTileSchema,
    homeTopbarWidgetIdSchema,
    nativeHomeTopbarWidgetIdSchema,
    HOME_FEATURE_IDS,
    HOME_FOLDER_MAX_ITEMS,
    HOME_SECTION_MAX_TILES,
    isFeatureTile,
    isHomeFolder,
    isShortcutTile,
    shortcutItemSchema,
    shortcutPreviewSchema,
    shortcutTemplateSchema,
    SHORTCUT_URL_MAX_LENGTH
} from './domain/home';
export type {
    HomeFeatureId,
    NativeHomeFeatureId,
    HomeFolder,
    HomeLayout,
    HomeSection,
    HomeTile,
    HomeTileKind,
    HomeTopbarWidgetId,
    NativeHomeTopbarWidgetId,
    ShortcutItem,
    ShortcutPreview,
    ShortcutTemplate
} from './domain/home';
export {
    liveCursorKindSchema,
    liveCursorSchema,
    livePathGate,
    livePathSchema,
    livePathSegmentSchema,
    livePeerSchema,
    liveTopicSchema,
    nativeLiveTopicSchema,
    segmentKind,
    segmentValue,
    TOPIC_FEATURE,
    topicFeatureOf
} from './domain/live';
export type {
    LiveCursor,
    LiveCursorKind,
    LivePath,
    LivePathGate,
    LivePeer,
    LiveTopic,
    NativeLiveTopic
} from './domain/live';
export {
    LIVE_CHANGED_EVENT,
    LIVE_CURSOR_COMMAND,
    LIVE_CURSORS_EVENT,
    LIVE_PEERS_EVENT,
    LIVE_SAY_COMMAND,
    LIVE_SAYS_EVENT,
    LIVE_TYPERS_EVENT,
    LIVE_TYPING_COMMAND,
    liveChangedPushSchema,
    liveCommands,
    liveCursorFrameSchema,
    liveCursorsPushSchema,
    liveHere,
    livePeersPushSchema,
    liveSayFrameSchema,
    liveSaysPushSchema,
    liveTypersPushSchema,
    liveTypingFrameSchema,
    SAY_MAX_LENGTH,
    SAY_MAX_LINES
} from './features/live';
export type {
    LiveChangedPush,
    LiveCursorFrame,
    LiveCursorsPush,
    LivePeersPush,
    LiveSayFrame,
    LiveSaysPush,
    LiveTypersPush,
    LiveTypingFrame
} from './features/live';
export {
    defaultUserColor,
    minimalUserSchema,
    USER_COLORS,
    userColorSchema,
    usernameSchema,
    userSchema,
    userSecuritySchema,
    userSettingFlagSchema,
    userStatusSchema
} from './domain/user';
export type {
    MinimalUser,
    User,
    UserColor,
    UserRow,
    UserSecurity,
    UserSettingFlag,
    UserStatus
} from './domain/user';
export { secrecyStatusSchema, secrecyWrapModeSchema } from './domain/secrecy';
export type { SecrecyStatus, SecrecyWrapMode, UserSecretKeyRow } from './domain/secrecy';
export { workspaceKindSchema, workspaceSchema } from './domain/workspace';
export {
    REMOTE_INSTANCES_MAX,
    REMOTE_LABEL_MAX,
    normalizeRemoteOrigin,
    remoteInstanceSchema,
    remoteOriginSchema
} from './domain/remoteInstance';
export type { RemoteInstance, RemoteInstanceRow } from './domain/remoteInstance';
export {
    EXTERNAL_FEATURE_ID_PATTERN,
    externalFeatureIdSchema,
    featureAccessSchema,
    featureIdSchema,
    isExternalFeatureId,
    WORKSPACE_CAPABILITIES,
    WORKSPACE_FEATURE_IDS,
    WORKSPACE_ROLE_NAME_MAX,
    workspaceCapabilitySchema,
    workspaceFeatureGrantSchema,
    workspaceFeatureIdSchema,
    workspacePermissionsSchema,
    workspaceRoleSchema
} from './domain/workspaceRole';
export type {
    ExternalFeatureId,
    FeatureAccess,
    FeatureId,
    ItemGrantOverride,
    WorkspaceCapability,
    WorkspaceFeatureGrant,
    WorkspaceFeatureId,
    WorkspacePermissions,
    WorkspaceRole,
    WorkspaceRoleRow
} from './domain/workspaceRole';
export type {
    Workspace,
    WorkspaceKind,
    WorkspaceMemberRow,
    WorkspaceRow
} from './domain/workspace';
export {
    DEFAULT_METRIC_INTERVAL_SECONDS,
    DEFAULT_PROCESS_CAPTURE,
    DEFAULT_RETENTION_DAYS,
    devicePlatformSchema,
    deviceSchema,
    deviceStatusSchema,
    terminalUser
} from './domain/device';
export type { Device, DevicePlatform, DeviceRow, DeviceStatus } from './domain/device';
export {
    isManagedPackageManager,
    packageManagerIdSchema,
    packageManagerSchema,
    unmanagedUpdaterIdSchema
} from './domain/packages';
export type { PackageManager, PackageManagerId, UnmanagedUpdaterId } from './domain/packages';
export {
    agentInfoSchema,
    agentPolicySchema,
    agentServiceScopeSchema,
    AUTH_LOGIN_LIMIT,
    AUTH_SOURCE_LIMIT,
    authLoginSchema,
    authSourceSchema,
    authWindowSchema,
    cpuInfoSchema,
    deviceHardwareSchema,
    deviceReportSchema,
    deviceSecuritySchema,
    integrityReportSchema,
    mandatoryAccessControlSchema,
    netInterfaceKindSchema,
    netInterfaceSchema,
    openPortSchema,
    PERSISTENCE_ENTRY_LIMIT,
    persistenceEntrySchema,
    processCaptureSchema,
    processKindSchema,
    processSampleSchema,
    reportDiskSchema,
    reportProcessSchema,
    tcpConnectionSchema
} from './domain/report';
export type {
    AgentInfo,
    AgentPolicy,
    AgentServiceScope,
    AuthLogin,
    AuthSource,
    AuthWindow,
    CpuInfo,
    DeviceHardware,
    DeviceReport,
    DeviceSecurity,
    IntegrityReport,
    MandatoryAccessControl,
    NetInterface,
    NetInterfaceKind,
    OpenPort,
    PersistenceEntry,
    ProcessCapture,
    ProcessKind,
    ProcessSample,
    ReportDisk,
    ReportProcess,
    TcpConnection
} from './domain/report';
export {
    NOTIFICATION_CHANNEL_KINDS,
    NOTIFICATION_EMAIL_MAX,
    NOTIFICATION_LABEL_MAX,
    NOTIFICATION_TARGET_MAX,
    notificationChannelInputSchema,
    notificationChannelKindSchema,
    notificationChannelSchema,
    notificationChannelUsageSchema,
    notificationFeatureSchema,
    nativeNotificationFeatureSchema,
    notificationRouteInputSchema,
    notificationRouteSchema,
    notificationRouteTargetSchema,
    notificationTestSchema
} from './domain/notifications';
export type {
    NotificationChannel,
    NotificationChannelInput,
    NotificationChannelKind,
    NotificationChannelRow,
    NotificationChannelUsage,
    NotificationFeature,
    NativeNotificationFeature,
    NotificationRoute,
    NotificationRouteInput,
    NotificationRouteRow,
    NotificationRouteTarget,
    NotificationTest
} from './domain/notifications';

export {
    FEATURE_REGISTRY,
    NOTIFYING_FEATURES,
    allFeatureDescriptors,
    featureDescriptor,
    featureLabel,
    itemNounForms,
    maybeFeatureDescriptor,
    registerExternalFeature
} from './domain/featureRegistry';
export type { FeatureDescriptor } from './domain/featureRegistry';
export {
    foreignRefSchema,
    itemAccessSchema,
    itemExtraOverridesSchema,
    itemGrantStateSchema,
    itemMoveDependencySchema,
    ITEM_COPY_CHUNK_CHARS,
    itemCopyManifestSchema,
    itemCopyPlanSchema,
    itemCopyTargetSchema,
    itemMovePreviewSchema,
    itemTierSchema,
    itemRefSchema,
    itemRoleGrantSchema,
    itemRoleGrantViewSchema,
    itemShareSchema,
    itemShareStateSchema,
    shareBlockerSchema
} from './domain/sharing';
export type {
    ForeignRef,
    ItemAccess,
    ItemExtraOverrides,
    ItemGrantState,
    ItemMoveDependency,
    ItemCopyManifest,
    ItemCopyPlan,
    ItemCopyTarget,
    ItemMovePreview,
    ItemRef,
    ItemRoleGrant,
    ItemRoleGrantRow,
    ItemRoleGrantView,
    ItemShare,
    ItemShareRow,
    ItemShareState,
    ShareBlocker
} from './domain/sharing';
export {
    itemGrantList,
    itemGrantSet,
    itemMove,
    itemCopyBegin,
    itemCopyChunk,
    itemCopyCommit,
    itemCopyExport,
    itemCopyPlan,
    itemCopyPut,
    itemCopyTarget,
    itemMovePreview,
    shareGet,
    shareSet,
    sharingCommands
} from './features/sharing';
export { linksCommands, projectLinksGet, projectLinksSet } from './features/links';
export {
    PROJECT_LINKED_FEATURES,
    SHAREABLE_FEATURES,
    SHARE_WIRED_FEATURES
} from './domain/featureRegistry';
export {
    DNS_RECORD_TYPES,
    FEATURE_DOMAIN_HOST_MAX,
    dnsRecordSchema,
    domainStateSchema,
    featureDomainSchema
} from './domain/featureDomain';
export type { DnsRecord, DomainState, FeatureDomain } from './domain/featureDomain';
export {
    domainAdd,
    domainCommands,
    domainList,
    domainRemove,
    domainVerify
} from './features/domain';
export {
    metricSeriesPointSchema,
    metricSnapshotSchema,
    metricsBatchSchema,
    metricsResolutionSchema
} from './domain/metrics';
export type {
    MetricRow,
    MetricSeriesPoint,
    MetricSnapshot,
    MetricsBatch,
    MetricsResolution
} from './domain/metrics';
export { twoFactorSetupSchema, twoFactorStatusSchema } from './domain/twoFactor';
export type {
    BackupCodeRow,
    TwoFactorRow,
    TwoFactorSetup,
    TwoFactorStatus
} from './domain/twoFactor';

export { homeCommands, homeSetLayout, homeShortcutPreview } from './features/home';
export {
    featureCommandRegistry,
    featureCommands,
    registerFeatureCommands
} from './features/registry';
export type {
    CommandInput,
    CommandOutput,
    FeatureCommandDescriptor,
    FeatureCommandName
} from './features/registry';
export {
    adminCommands,
    adminDeleteUser,
    adminMaintenanceDismissNotice,
    adminMaintenanceFeature,
    adminMaintenanceGet,
    adminMaintenanceSchema,
    adminMaintenanceSite,
    adminSetUserRole,
    adminSetUserStatus,
    adminUserList,
    adminUserSchema
} from './features/admin';
export type { AdminMaintenance, AdminUser } from './features/admin';
export {
    workspaceActivate,
    workspaceAdd,
    workspaceCommands,
    workspaceDelete,
    workspaceLeave,
    workspaceRemoveMember,
    workspaceAddMember,
    workspaceAssignRole,
    workspaceRename,
    workspaceRoleCreate,
    workspaceRoleDelete,
    workspaceRoleList,
    workspaceRoleSetDefault,
    workspaceRoleUpdate,
    workspaceSetFavorite
} from './features/workspace';
export {
    remoteAdd,
    remoteCommands,
    remoteList,
    remoteRemove,
    remoteRename,
    remoteReorder
} from './features/remote';
export {
    AVATAR_MAX_LENGTH,
    THEME_IMAGE_MAX_LENGTH,
    THEME_SLOT_COUNT,
    THEME_SLOT_IMAGE_MAX_LENGTH,
    themeStateSchema,
    accountPlanSchema,
    userCommands,
    userDeleteAccount,
    userPlan,
    userSetAvatar,
    userSetColor,
    userSetSetting,
    userSetTheme,
    userSetUsername
} from './features/user';
export type { ThemeStateDTO } from './features/user';
export {
    agentCollect,
    agentCommands,
    agentDropPrivileges,
    agentElevate,
    agentFilesAnalyze,
    agentFilesDownload,
    agentFilesList,
    agentFilesMutate,
    agentFilesSearch,
    agentFilesUpload,
    agentDockerAction,
    agentDockerInventory,
    agentDockerStats,
    agentLifecycle,
    agentListPackages,
    agentLogQuery,
    agentLogSources,
    agentPower,
    agentSetAutostart,
    agentSubscribe,
    agentTermClose,
    agentTermInput,
    agentTermOpen,
    agentTermResize,
    agentUnsubscribe,
    agentUpdate,
    agentUpgradePackages
} from './features/agent';
export {
    notifyChannelAdd,
    notifyChannelDelete,
    notifyChannelList,
    notifyChannelReorder,
    notifyChannelTest,
    notifyChannelUpdate,
    notifyChannelUsage,
    notifyCommands,
    notifyRouteGet,
    notifyRouteSet,
    notifyRouteTest
} from './features/notify';
export {
    twoFactorCommands,
    twoFactorDisable,
    twoFactorEnable,
    twoFactorGetStatus,
    twoFactorRegenBackup,
    twoFactorSetup
} from './features/twoFactor';
export {
    secrecyCommands,
    secrecyDisable,
    secrecyEnable,
    secrecyHold,
    secrecyLock,
    secrecyRecover,
    secrecyRegenerateRecovery,
    secrecySetReauth,
    secrecyStatus,
    secrecyTouch,
    secrecyUnlock
} from './features/secrecy';
export {
    LOGS_PAGE_DEFAULT,
    LOGS_PAGE_MAX,
    logFilterSchema,
    logsCommands,
    logsFacetSchema,
    logsFacetUserSchema,
    logsFacets,
    logsList
} from './features/logs';
export type { LogFilter } from './features/logs';
export {
    FEEDBACK_PAGE_DEFAULT,
    FEEDBACK_PAGE_MAX,
    feedbackCommands,
    feedbackDelete,
    feedbackFilterSchema,
    feedbackList,
    feedbackSetStatus,
    feedbackSubmit
} from './features/feedback';
export type { FeedbackFilter } from './features/feedback';

export {
    changePasswordRequestSchema,
    changePasswordResponseSchema,
    loginRequestSchema,
    loginResponseSchema,
    meResponseSchema,
    passwordSchema,
    refreshRequestSchema,
    refreshResponseSchema,
    sessionBundleSchema,
    sessionTokensSchema,
    signupAvailabilitySchema,
    signupCompleteRequestSchema,
    signupCompleteResponseSchema,
    signupStartRequestSchema,
    signupStartResponseSchema,
    signupStatusSchema,
    signupVerifyRequestSchema,
    signupVerifyResponseSchema,
    twoFactorChallengeRequestSchema,
    wsTicketResponseSchema
} from './http/auth';
export type {
    ChangePasswordRequest,
    ChangePasswordResponse,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RefreshRequest,
    RefreshResponse,
    SessionBundle,
    SessionTokens,
    SignupAvailability,
    SignupCompleteRequest,
    SignupCompleteResponse,
    SignupStartRequest,
    SignupStartResponse,
    SignupStatus,
    SignupVerifyRequest,
    SignupVerifyResponse,
    TwoFactorChallengeRequest,
    WsTicketResponse
} from './http/auth';
export {
    AGENT_TARGETS,
    agentManifestSchema,
    agentManifestTargetSchema,
    agentTargetSchema,
    agentTargetsResponseSchema,
    agentTargetStatusSchema,
    enrollDeviceRequestSchema,
    enrollDeviceResponseSchema,
    LINK_CODE_TTL_MAX_SECONDS,
    linkCodeRequestSchema,
    linkCodeResponseSchema,
    linkCodesListResponseSchema
} from './http/device';
export type {
    AgentManifest,
    AgentManifestTarget,
    AgentOs,
    AgentTarget,
    AgentTargetMeta,
    AgentTargetsResponse,
    AgentTargetStatus,
    EnrollDeviceRequest,
    EnrollDeviceResponse,
    LinkCodeRequest,
    LinkCodeResponse,
    LinkCodesListResponse
} from './http/device';
export {
    BUILD_MANIFEST_PATH,
    bootTaskSchema,
    bootTaskStateSchema,
    buildManifestSchema,
    serverStatusSchema
} from './http/status';
export type { BootTask, BootTaskState, BuildManifest, ServerStatus } from './http/status';

export { compareVersions, isNewerVersion } from './utils/version';
