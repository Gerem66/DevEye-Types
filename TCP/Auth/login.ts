import type { DBType_User } from '../../DB/User';

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
              user: DBType_User;
          };
}
