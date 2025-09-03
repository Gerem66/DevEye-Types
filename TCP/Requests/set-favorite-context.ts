import type { FeaturesID } from '../../Feature';

export interface RequestSetFavoriteContext {
    input: {
        contextID: number;
        featureID: FeaturesID;
    };
    output: {
        status: number;
    };
}
