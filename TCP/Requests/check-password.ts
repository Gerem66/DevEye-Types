export interface RequestCheckPassword {
    input: {
        contextID: number;
        password: string;
    };
    output: {
        status: number;
        message: string | null;
    };
}
