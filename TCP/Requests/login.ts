import type { UserType } from '../../User';

export interface RequestLogin {
    input: {
        token: string;
        password: string | null;
    };
    output:
        | {
              status: 'error';
          }
        | {
              status: 'success';
              user: UserType;
          };
}
