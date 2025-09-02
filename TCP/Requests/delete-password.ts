export interface RequestDeletePassword {
    input: {
        contextID: number;
        passwordID: number;
    };
    output: {
        status: number;
    };
}
