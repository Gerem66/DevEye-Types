export interface RequestDeletePassword {
    input: {
        workspaceID: number;
        passwordID: number;
    };
    output: {
        status: 'error' | 'success';
    };
}
