import type { DBType_User } from './DB/User';
import type { DBType_Workspace } from './DB/Workspaces';

export type FeaturesID = 'dashboard' | 'profile' | 'password' | 'gamelife';

export interface FeatureProps {
    user: DBType_User;
    setUser: (user: DBType_User | null) => void;
    workspace: DBType_Workspace;
    feature: FeatureType;
    setWorkspace: (workspace: DBType_Workspace) => void;
    setFeature: (feature: FeatureType) => void;
}

export interface FeatureType {
    id: FeaturesID;
    name: string;
    icon: string; // Icon type
    component: React.ComponentType<FeatureProps>;
}
