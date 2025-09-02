import type { PasswordType } from '../../Password';

export interface RequestAddPassword {
    input: {
        contextID: number;
        password: PasswordType;
    };
    output: {
        status: number;
        password: PasswordType | null;
    };
}
