import type { PasswordType } from '../../Password';

export interface RequestGetPasswords {
    input: {
        contextID: number;
    };
    output:
        | {
              status: 'error';
          }
        | {
              status: 'success';
              passwords: PasswordType[];
          };
}
