import type { PasswordType } from '../../Password';

export interface RequestGetPasswords {
    input: {
        contextID: number;
    };
    output: {
        status: number;
        passwords: Array<PasswordType> | null;
    };
}
