// Protocol
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
    AGENT_COLLECT,
    AGENT_CONFIG,
    AGENT_DESTROY,
    AGENT_DESTROYED,
    AGENT_ERROR,
    AGENT_FILES_ANALYZE,
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
    AGENT_HELLO,
    AGENT_LIFECYCLE,
    AGENT_LOG_LINES,
    AGENT_LOG_QUERY,
    AGENT_LOG_SOURCES,
    AGENT_LOG_SOURCES_RESULT,
    AGENT_METRICS_BATCH,
    AGENT_PKG_DONE,
    AGENT_PKG_LIST,
    AGENT_PKG_LIST_RESULT,
    AGENT_PKG_PROGRESS,
    AGENT_PKG_UPGRADE,
    AGENT_POWER,
    AGENT_POWER_RESULT,
    AGENT_PROCESSES,
    AGENT_REPORT,
    AGENT_SERVICE,
    AGENT_SERVICE_RESULT,
    AGENT_SYNC_ACK,
    AGENT_SYNC_APPLY_CHUNK,
    AGENT_SYNC_CHANGED,
    AGENT_SYNC_CHUNK,
    AGENT_SYNC_CONFIG,
    AGENT_SYNC_DELETE,
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
    agentLogSourcesResultPayloadSchema,
    agentPkgDonePayloadSchema,
    agentPkgListResultPayloadSchema,
    agentPkgProgressPayloadSchema,
    agentPkgUpgradePayloadSchema,
    agentPowerActionSchema,
    agentPowerPayloadSchema,
    agentPowerResultPayloadSchema,
    agentProcessesMessagePayloadSchema,
    agentReportMessagePayloadSchema,
    agentServerMessageSchema,
    agentServiceActionSchema,
    agentServicePayloadSchema,
    agentServiceResultPayloadSchema,
    agentSyncAckPayloadSchema,
    agentSyncApplyChunkPayloadSchema,
    agentSyncChangedPayloadSchema,
    agentSyncChunkPayloadSchema,
    agentSyncConfigPayloadSchema,
    agentSyncDeletePayloadSchema,
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
    DEVICE_LOG_SOURCES_EVENT,
    DEVICE_POWER_EVENT,
    DEVICE_PRESENCE_EVENT,
    DEVICE_REPORT_EVENT,
    DEVICE_TERM_EXIT_EVENT,
    DEVICE_TERM_OUTPUT_EVENT,
    deviceFilesChunkPushSchema,
    deviceFilesListingPushSchema,
    deviceFilesMatchesPushSchema,
    deviceFilesOpPushSchema,
    deviceFilesUsagePushSchema,
    deviceLogLinesPushSchema,
    deviceLogSourcesPushSchema,
    devicePowerPushSchema,
    devicePresenceSchema,
    deviceReportPushSchema,
    deviceTermExitPushSchema,
    deviceTermOutputPushSchema,
    METRICS_PUSH_EVENT,
    metricsPushSchema,
    PACKAGE_DONE_EVENT,
    PACKAGE_LIST_EVENT,
    PACKAGE_PROGRESS_EVENT,
    packageDonePushSchema,
    packageListPushSchema,
    packageProgressPushSchema,
    syncIndexEntrySchema,
    syncShareAssignmentSchema
} from './protocol/agent';
export type {
    AgentClientMessage,
    AgentConfigPayload,
    AgentFilesAnalyzePayload,
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
    AgentSyncApplyChunkPayload,
    AgentSyncConfigPayload,
    AgentSyncDeletePayload,
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
    DeviceLogSourcesPush,
    DevicePowerPush,
    DevicePresence,
    DeviceReportPush,
    DeviceTermExitPush,
    DeviceTermOutputPush,
    MetricsPush,
    PackageDonePush,
    PackageListPush,
    PackageProgressPush,
    SyncIndexEntry,
    SyncShareAssignment
} from './protocol/agent';

// Domain
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
    DEVICE_LOG_LEVELS,
    DEVICE_LOG_PAGE_DEFAULT,
    DEVICE_LOG_PAGE_MAX,
    deviceLogFilterSchema,
    deviceLogLevelSchema,
    deviceLogLineSchema,
    deviceLogSourceKindSchema,
    deviceLogSourceSchema
} from './domain/deviceLogs';
export type {
    DeviceLogFilter,
    DeviceLogLevel,
    DeviceLogLine,
    DeviceLogSource,
    DeviceLogSourceKind
} from './domain/deviceLogs';
export {
    cloudSyncEventSchema,
    cloudSyncExclusionSchema,
    cloudSyncFileSchema,
    cloudSyncProgressSchema,
    cloudSyncShareDeviceSchema,
    cloudSyncShareSchema,
    cloudSyncShareStateSchema,
    cloudSyncShareStatsSchema,
    cloudSyncVersionSchema,
    sha256HexSchema,
    SYNC_CHUNK_MAX,
    SYNC_DEFAULT_IGNORED_NAMES,
    SYNC_INDEX_BATCH_MAX,
    SYNC_MTIME_SKEW_MS,
    SYNC_NAME_MAX,
    SYNC_PATTERN_MAX,
    SYNC_REL_PATH_MAX,
    SYNC_STORAGE_PATH_MAX,
    syncConflictPolicySchema,
    syncDirectionSchema,
    syncExclusionKindSchema,
    syncFileStateSchema,
    syncSessionStateSchema,
    syncShareStatusSchema,
    syncVersionReasonSchema,
    syncVersionSortSchema
} from './domain/cloudSync';
export type {
    CloudSyncEvent,
    CloudSyncExclusion,
    CloudSyncFile,
    CloudSyncProgress,
    CloudSyncShare,
    CloudSyncShareDevice,
    CloudSyncShareState,
    CloudSyncShareStats,
    CloudSyncVersion,
    SyncConflictPolicy,
    SyncDeviceFileRow,
    SyncDirection,
    SyncEventRow,
    SyncExclusionKind,
    SyncExclusionRow,
    SyncFileRow,
    SyncFileState,
    SyncSessionRow,
    SyncSessionState,
    SyncShareDeviceRow,
    SyncShareRow,
    SyncShareStatus,
    SyncVersionReason,
    SyncVersionRow,
    SyncVersionSort
} from './domain/cloudSync';
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
    passwordEntryMaskedSchema,
    passwordEntrySchema,
    passwordStatusSchema
} from './domain/password';
export type {
    PasswordEntry,
    PasswordEntryMasked,
    PasswordRow,
    PasswordStatus
} from './domain/password';
export {
    NOTE_BLOCK_TEXT_MAX_LENGTH,
    NOTE_FOLDER_MAX_LENGTH,
    NOTE_MAX_BLOCKS,
    NOTE_TITLE_MAX_LENGTH,
    noteBlockSchema,
    noteBulletBlockSchema,
    noteCheckBlockSchema,
    noteDividerBlockSchema,
    noteFolderSchema,
    noteHeadingBlockSchema,
    noteNumberBlockSchema,
    noteSchema,
    noteSummarySchema,
    noteTextBlockSchema
} from './domain/note';
export type {
    Note,
    NoteBlock,
    NoteBulletBlock,
    NoteCheckBlock,
    NoteDividerBlock,
    NoteFolder,
    NoteFolderRow,
    NoteHeadingBlock,
    NoteNumberBlock,
    NoteRow,
    NoteSummary,
    NoteTextBlock
} from './domain/note';
export { userRoleSchema } from './domain/role';
export type { UserRole } from './domain/role';
export {
    homeCategoryKindSchema,
    homeCategorySchema,
    homeFeatureIdSchema,
    homeLayoutSchema,
    homeTopbarWidgetIdSchema,
    shortcutItemSchema,
    shortcutPreviewSchema,
    shortcutTemplateSchema,
    SHORTCUT_URL_MAX_LENGTH
} from './domain/home';
export type {
    HomeCategory,
    HomeCategoryKind,
    HomeFeatureId,
    HomeLayout,
    HomeTopbarWidgetId,
    ShortcutItem,
    ShortcutPreview,
    ShortcutTemplate
} from './domain/home';
export { defaultUser, minimalUserSchema, userSchema, userSecuritySchema } from './domain/user';
export type { MinimalUser, User, UserRow, UserSecurity } from './domain/user';
export { secrecyStatusSchema, secrecyWrapModeSchema } from './domain/secrecy';
export type { SecrecyStatus, SecrecyWrapMode, UserSecretKeyRow } from './domain/secrecy';
export { workspaceSchema } from './domain/workspace';
export type { Workspace, WorkspaceMemberRow, WorkspaceRow } from './domain/workspace';
export { devicePlatformSchema, deviceSchema, deviceStatusSchema } from './domain/device';
export type { Device, DevicePlatform, DeviceRow, DeviceStatus } from './domain/device';
export { packageManagerIdSchema, packageManagerSchema } from './domain/packages';
export type { PackageManager, PackageManagerId } from './domain/packages';
export {
    agentInfoSchema,
    agentServiceScopeSchema,
    cpuInfoSchema,
    deviceHardwareSchema,
    deviceReportSchema,
    deviceSecuritySchema,
    netInterfaceKindSchema,
    netInterfaceSchema,
    openPortSchema,
    processCaptureSchema,
    processKindSchema,
    processSampleSchema,
    reportDiskSchema,
    reportProcessSchema,
    tcpConnectionSchema
} from './domain/report';
export type {
    AgentInfo,
    AgentServiceScope,
    CpuInfo,
    DeviceHardware,
    DeviceReport,
    DeviceSecurity,
    NetInterface,
    NetInterfaceKind,
    OpenPort,
    ProcessCapture,
    ProcessKind,
    ProcessSample,
    ProcessSampleRow,
    ReportDisk,
    ReportProcess,
    TcpConnection
} from './domain/report';
export { presenceEventSchema } from './domain/presence';
export type { PresenceEvent, PresenceRow } from './domain/presence';
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
export {
    weatherConditionSchema,
    weatherDaySchema,
    weatherFormatSchema,
    weatherHourSchema,
    weatherLocationSchema,
    weatherProviderSchema,
    weatherReportSchema
} from './domain/weather';
export type {
    WeatherCondition,
    WeatherDay,
    WeatherFormat,
    WeatherHour,
    WeatherLocation,
    WeatherLocationRow,
    WeatherProvider,
    WeatherProviderKeyRow,
    WeatherReport
} from './domain/weather';

// Features
export {
    passwordAdd,
    passwordCommands,
    passwordCount,
    passwordDelete,
    passwordEdit,
    passwordGet,
    passwordList,
    passwordUnlock
} from './features/password';
export {
    folderAdd,
    folderDelete,
    folderList,
    folderRename,
    folderReorder,
    noteAdd,
    noteCommands,
    noteCount,
    noteDelete,
    noteEdit,
    noteGet,
    noteList,
    noteMove
} from './features/note';
export { homeCommands, homeSetLayout, homeShortcutPreview } from './features/home';
export { featureCommandRegistry, featureCommands } from './features/registry';
export type {
    CommandInput,
    CommandOutput,
    FeatureCommandDescriptor,
    FeatureCommandName
} from './features/registry';
export { workspaceAdd, workspaceCommands, workspaceDelete } from './features/workspace';
export {
    AVATAR_MAX_LENGTH,
    THEME_IMAGE_MAX_LENGTH,
    THEME_SLOT_COUNT,
    THEME_SLOT_IMAGE_MAX_LENGTH,
    themeStateSchema,
    userCommands,
    userSetAvatar,
    userSetTheme
} from './features/user';
export type { ThemeStateDTO } from './features/user';
export {
    deviceCancelDelete,
    deviceCommands,
    deviceConfirm,
    deviceDelete,
    deviceDropPrivileges,
    deviceElevate,
    deviceForceDelete,
    deviceList,
    deviceListPackages,
    deviceAgentLifecycle,
    devicePower,
    deviceReactivate,
    deviceRename,
    deviceRequestDelete,
    deviceRevoke,
    deviceSetAutostart,
    deviceSetConfig,
    deviceUpdateAgent,
    deviceUpgradePackages
} from './features/device';
export { deviceLogCommands, deviceLogQuery, deviceLogSources } from './features/deviceLogs';
export {
    deviceFilesAnalyze,
    deviceFilesCommands,
    deviceFilesDownload,
    deviceFilesList,
    deviceFilesMutate,
    deviceFilesSearch,
    deviceFilesUpload
} from './features/deviceFiles';
export {
    cloudSyncAddExclusion,
    cloudSyncAttachDevice,
    cloudSyncBrowse,
    cloudSyncClearVersions,
    cloudSyncCommands,
    cloudSyncCreateShare,
    cloudSyncDeleteShare,
    cloudSyncDeleteVersion,
    cloudSyncDeleteVersions,
    cloudSyncDetachDevice,
    cloudSyncDownloadFile,
    cloudSyncDownloadVersion,
    cloudSyncListEvents,
    cloudSyncListShares,
    cloudSyncListVersions,
    cloudSyncPauseDevice,
    cloudSyncPauseShare,
    cloudSyncRemoveExclusion,
    cloudSyncRestoreVersion,
    cloudSyncResumeDevice,
    cloudSyncResumeShare,
    cloudSyncSubscribe,
    cloudSyncSyncNow,
    cloudSyncUnsubscribe,
    cloudSyncUpdateShare,
    cloudSyncValidatePath
} from './features/cloudSync';
export {
    deviceTerminalCommands,
    deviceTermClose,
    deviceTermInput,
    deviceTermOpen,
    deviceTermResize,
    terminalUser
} from './features/deviceTerminal';
export {
    metricsAvailability,
    metricsCommands,
    metricsDeleteSnapshots,
    metricsPresence,
    metricsProcessesAt,
    metricsQuery,
    metricsRefresh,
    metricsSetSnapshotsPinned,
    metricsSnapshots,
    metricsStorage,
    metricsSubscribe,
    metricsUnsubscribe
} from './features/metrics';
export {
    weatherAdd,
    weatherCommands,
    weatherGet,
    weatherList,
    weatherRemove,
    weatherReorder,
    weatherSetKey,
    weatherSetPrimary,
    weatherUpdate
} from './features/weather';
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

// HTTP
export {
    changePasswordRequestSchema,
    changePasswordResponseSchema,
    loginRequestSchema,
    loginResponseSchema,
    meResponseSchema,
    refreshResponseSchema,
    registerRequestSchema,
    twoFactorChallengeRequestSchema
} from './http/auth';
export type {
    ChangePasswordRequest,
    ChangePasswordResponse,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RefreshResponse,
    RegisterRequest,
    TwoFactorChallengeRequest
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
    linkCodesListResponseSchema,
    linkCodeUpdateSchema
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
    LinkCodesListResponse,
    LinkCodeUpdate
} from './http/device';
export { bootTaskSchema, bootTaskStateSchema, serverStatusSchema } from './http/status';
export type { BootTask, BootTaskState, ServerStatus } from './http/status';

// Utils
export { compareVersions, isNewerVersion } from './utils/version';
