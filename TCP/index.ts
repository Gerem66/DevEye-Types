import { RequestCommands } from './commands';

export type ConnectionState = 'idle' | 'connected' | 'disconnected' | 'error';

export type TCPRequestSendHeader = {
    [K in keyof RequestCommands]: {
        action: K;
        content: RequestCommands[K]['input'];
        callbackID?: string;
    };
}[keyof RequestCommands];

export type TCPRequestReceiveHeader = {
    [K in keyof RequestCommands]: {
        action: K;
        content: RequestCommands[K]['output'] | { status: 'error'; message: string };
        callbackID?: string;
    };
}[keyof RequestCommands];
