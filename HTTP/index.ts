export interface EndpointTypes {
    auth: {
        input: {
            username: string;
            password: string;
        };
        output: {
            status: number;
            message: string;
            content: string | null;
        };
    };
    'check-token': {
        input: {
            token: string;
        };
        output: {
            status: number;
            message: string;
            content: null;
        };
    };
    'get-token': {
        input: {
            code: string;
            token: string;
        };
        output: {
            status: number;
            message: string;
            content: string | null;
        };
    };
}

export type Endpoints = keyof EndpointTypes;
