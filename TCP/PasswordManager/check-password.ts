export interface RequestCheckPassword {
    input: {
        workspaceID: number;
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
