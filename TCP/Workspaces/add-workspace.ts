import type { DBType_Workspace } from '../../DB/Workspaces';

export interface RequestAddWorkspace {
    input: {
        workspaceName: string;
    };
    output:
        | {
              status: 'error';
          }
        | {
              status: 'success';
              workspace: DBType_Workspace;
          };
}
