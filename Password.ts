export type PasswordStatus = 'active' | 'inactive' | 'none';

export interface PasswordDatabaseType {
    ID: number;
    UserID: number;
    ContextID: number | null;
    Content: string;
    Date: number;
}

export interface PasswordType {
    ID: number;
    category: string;
    service: string;
    email: string;
    password: string;
    status: PasswordStatus;
}
