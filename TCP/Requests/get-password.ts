import type { PasswordType } from '../../Password';

export interface RequestGetPassword {
    input: {
        contextID: number;
        passwordID: number;
    };
    output: {
        status: number;
        password: PasswordType | null;
    };
}
