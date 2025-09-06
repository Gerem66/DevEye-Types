export interface DBType_WorkspaceMembers_Raw {
    ID: number;
    UserID: number;
    WorkspaceID: number;
    Roles: string; // JSON string array
    Date: number; // timestamp
}

export interface DBType_WorkspaceMembers {
    id: number;
    userId: number;
    workspaceId: number;
    roles: string[];
    date: number;
}
