export interface RequestGamelifeSetLoop {
    input: {
        workspaceID: number;
        type: 'open' | 'close';
        intervalID?: string;
    };
    output:
        | {
              status: 'error';
          }
        | {
              status: 'success';
              intervalID: string;
          };
}
