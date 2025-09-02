import { RequestCommands } from './Requests';

export type ConnectionState = 'idle' | 'connected' | 'disconnected' | 'error';

export interface TCPRequestSendHeader<T extends keyof RequestCommands> {
    action: T;
    content: RequestCommands[T]['input'];
    callbackID?: string;
}

export interface TCPRequestReceiveHeader<T extends keyof RequestCommands> {
    action: T;
    content: RequestCommands[T]['output'];
    callbackID?: string;
}
