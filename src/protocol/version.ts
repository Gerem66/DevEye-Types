/**
 * Protocol version negotiated between client and server.
 * Bump on any breaking change to wire format, feature schemas or error codes.
 */
export const PROTOCOL_VERSION = '0.2.0' as const;
export type ProtocolVersion = typeof PROTOCOL_VERSION;
