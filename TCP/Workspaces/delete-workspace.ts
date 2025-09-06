export interface RequestDeleteWorkspace {
    input: {
        workspaceID: number;
        // passwordID: number; ?
    };
    output: {
        status: 'error' | 'success';
    };
}
