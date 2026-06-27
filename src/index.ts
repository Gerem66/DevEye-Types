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
    AGENT_HELLO,
    AGENT_METRICS_BATCH,
    AGENT_PKG_DONE,
    AGENT_PKG_LIST,
    AGENT_PKG_LIST_RESULT,
    AGENT_PKG_PROGRESS,
    AGENT_PKG_UPGRADE,
    AGENT_PROCESSES,
    AGENT_REPORT,
    AGENT_SERVICE,
    AGENT_SERVICE_RESULT,
    AGENT_UPDATE,
    AGENT_UPDATED,
    agentClientMessageSchema,
    agentConfigPayloadSchema,
    agentDestroyedMessagePayloadSchema,
    agentPkgDonePayloadSchema,
    agentPkgListResultPayloadSchema,
    agentPkgProgressPayloadSchema,
    agentPkgUpgradePayloadSchema,
    agentProcessesMessagePayloadSchema,
    agentReportMessagePayloadSchema,
    agentServerMessageSchema,
    agentServiceActionSchema,
    agentServicePayloadSchema,
    agentServiceResultPayloadSchema,
    agentUpdatedMessagePayloadSchema,
    agentUpdatePayloadSchema,
    DEVICE_PRESENCE_EVENT,
    DEVICE_REPORT_EVENT,
    devicePresenceSchema,
    deviceReportPushSchema,
    METRICS_PUSH_EVENT,
    metricsPushSchema,
    PACKAGE_DONE_EVENT,
    PACKAGE_LIST_EVENT,
    PACKAGE_PROGRESS_EVENT,
    packageDonePushSchema,
    packageListPushSchema,
    packageProgressPushSchema
} from './protocol/agent';
export type {
    AgentClientMessage,
    AgentConfigPayload,
    AgentPkgUpgradePayload,
    AgentServerMessage,
    AgentServiceAction,
    AgentServicePayload,
    AgentUpdatePayload,
    DevicePresence,
    DeviceReportPush,
    MetricsPush,
    PackageDonePush,
    PackageListPush,
    PackageProgressPush
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
    noteCheckBlockSchema,
    noteFolderSchema,
    noteSchema,
    noteSummarySchema,
    noteTextBlockSchema
} from './domain/note';
export type {
    Note,
    NoteBlock,
    NoteCheckBlock,
    NoteFolder,
    NoteFolderRow,
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
    deviceReactivate,
    deviceRename,
    deviceRequestDelete,
    deviceRevoke,
    deviceSetAutostart,
    deviceSetConfig,
    deviceUpdateAgent,
    deviceUpgradePackages
} from './features/device';
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
    secrecyRecover,
    secrecySetReauth,
    secrecyStatus,
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
