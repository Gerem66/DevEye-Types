import type { PasswordType } from '../../Password';

export interface RequestEditPassword {
    input: {
        contextID: number;
        password: PasswordType;
    };
    output: {
        status: number;
        password: PasswordType | null;
    };
}
