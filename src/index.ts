// Protocol
export { clientMessageSchema, serverMessageSchema } from './protocol/envelope';
export type { ClientMessage, ConnectionState, ServerMessage } from './protocol/envelope';
export { ErrorCodeSchema, ProtocolErrorSchema } from './protocol/error';
export type { ErrorCode, ProtocolError } from './protocol/error';
export { err, ok, resultSchema } from './protocol/result';
export type { Result } from './protocol/result';
export { PROTOCOL_VERSION } from './protocol/version';
export type { ProtocolVersion } from './protocol/version';

// Domain
export { logEntrySchema } from './domain/logs';
export type { LogEntry, LogRow } from './domain/logs';
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
export { defaultUser, minimalUserSchema, userSchema } from './domain/user';
export type { MinimalUser, User, UserRow } from './domain/user';
export { workspaceSchema } from './domain/workspace';
export type { Workspace, WorkspaceMemberRow, WorkspaceRow } from './domain/workspace';

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
export { featureCommandRegistry, featureCommands } from './features/registry';
export type {
    CommandInput,
    CommandOutput,
    FeatureCommandDescriptor,
    FeatureCommandName
} from './features/registry';
export {
    workspaceAdd,
    workspaceCommands,
    workspaceDelete,
    workspaceSetFavoriteFeature
} from './features/workspace';

// HTTP
export {
    loginRequestSchema,
    loginResponseSchema,
    meResponseSchema,
    refreshResponseSchema
} from './http/auth';
export type { LoginRequest, LoginResponse, MeResponse, RefreshResponse } from './http/auth';
