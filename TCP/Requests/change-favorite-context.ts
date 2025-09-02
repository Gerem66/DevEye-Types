import type { FeaturesID } from '../../Feature';

export interface RequestChangeFavoriteContext {
    input: {
        contextID: number;
        featureID: FeaturesID;
    };
    output: {
        status: number;
    };
}
