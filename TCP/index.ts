import type { RequestClientToServer } from './ClientToServer';
import type { RequestServerToClient } from './ServerToClient';

export type ConnectionState = 'idle' | 'connected' | 'disconnected' | 'error';

export interface TCPRequestSendHeader<T extends keyof RequestClientToServer> {
    action: T;
    content: RequestClientToServer[T];
    callbackID?: string;
}

export interface TCPRequestReceiveHeader<T extends keyof RequestServerToClient> {
    action: T;
    content: RequestServerToClient[T];
    callbackID?: string;
}
