import type { PasswordType } from '../../Password';

export interface RequestAddPassword {
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
