import type { FeaturesID } from '../../Feature';

export interface RequestSetFavoriteWorkspace {
    input: {
        workspaceID: number;
        featureID: FeaturesID;
    };
    output: {
        status: 'success' | 'error';
    };
}
