import type { PasswordType } from '../../Password';

export interface RequestGetPassword {
    input: {
        contextID: number;
        passwordID: number;
    };
    output:
        | {
              status: 'unlock-failed' | 'error';
          }
        | {
              status: 'success';
              password: PasswordType;
          };
}
