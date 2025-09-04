import type { PasswordType } from '../../Password';

export interface RequestEditPassword {
    input: {
        contextID: number;
        password: PasswordType;
    };
    output:
        | {
              status: 'error';
          }
        | {
              status: 'success';
              password: PasswordType;
          };
}
