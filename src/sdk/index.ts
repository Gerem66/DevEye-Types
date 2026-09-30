/**
 * The DevEye feature SDK, shared surface: ids and the manifest contract.
 *
 * Side-specific surfaces live in their own entries so neither bundle drags the
 * other's world in: `@deveye/types/sdk/server` (handlers, storage, facade),
 * `@deveye/types/sdk/client` (component contracts), `@deveye/types/sdk/testing`
 * (handler test harness).
 */
export * from './deviceRelayOption';
export * from './ids';
export * from './manifest';
export * from './pageLook';
export * from './providers';
