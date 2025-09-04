export interface RequestCheckPassword {
    input: {
        contextID: number;
        password: string;
    };
    output:
        | {
              status: 'unlocked';
          }
        | {
              status: 'wrong-user-or-password' | 'error';
              message: string;
          };
}
