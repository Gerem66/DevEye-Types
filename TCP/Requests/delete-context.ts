export interface RequestDeleteContext {
    input: {
        contextID: number;
        // passwordID: number; ?
    };
    output: {
        status: number;
    };
}
