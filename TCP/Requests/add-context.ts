import type { ContextType } from '../../Context';

export interface RequestAddContext {
    input: {
        contextName: string;
    };
    output: {
        status: number;
        context: ContextType | null;
    };
}
