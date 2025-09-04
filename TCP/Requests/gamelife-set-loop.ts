export interface RequestGamelifeSetLoop {
    input: {
        contextID: number;
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
