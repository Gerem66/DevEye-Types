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
    AGENT_ERROR,
    AGENT_HELLO,
    AGENT_METRICS_BATCH,
    agentClientMessageSchema,
    agentServerMessageSchema,
    DEVICE_PRESENCE_EVENT,
    devicePresenceSchema,
    METRICS_PUSH_EVENT,
    metricsPushSchema
} from './protocol/agent';
export type {
    AgentClientMessage,
    AgentServerMessage,
    DevicePresence,
    MetricsPush
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
export { defaultUser, minimalUserSchema, userSchema, userSecuritySchema } from './domain/user';
export type { MinimalUser, User, UserRow, UserSecurity } from './domain/user';
export { secrecyStatusSchema, secrecyWrapModeSchema } from './domain/secrecy';
export type { SecrecyStatus, SecrecyWrapMode, UserSecretKeyRow } from './domain/secrecy';
export { workspaceSchema } from './domain/workspace';
export type { Workspace, WorkspaceMemberRow, WorkspaceRow } from './domain/workspace';
export { devicePlatformSchema, deviceSchema, deviceStatusSchema } from './domain/device';
export type { Device, DevicePlatform, DeviceRow, DeviceStatus } from './domain/device';
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
    noteDelete,
    noteEdit,
    noteGet,
    noteList,
    noteMove
} from './features/note';
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
    themeStateSchema,
    userCommands,
    userSetAvatar,
    userSetTheme
} from './features/user';
export type { ThemeStateDTO } from './features/user';
export {
    deviceCommands,
    deviceConfirm,
    deviceDelete,
    deviceList,
    deviceRename,
    deviceRevoke
} from './features/device';
export {
    metricsCommands,
    metricsQuery,
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
    enrollDeviceRequestSchema,
    enrollDeviceResponseSchema,
    linkCodeResponseSchema
} from './http/device';
export type { EnrollDeviceRequest, EnrollDeviceResponse, LinkCodeResponse } from './http/device';
