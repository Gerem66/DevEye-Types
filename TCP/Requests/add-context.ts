import type { ContextType } from '../../Context';

export interface RequestAddContext {
    input: {
        contextName: string;
    };
    output:
        | {
              status: 'error';
          }
        | {
              status: 'success';
              context: ContextType;
          };
}
