import type { PasswordType } from '../../Password';

export interface RequestGetPasswords {
    input: {
        workspaceID: number;
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
