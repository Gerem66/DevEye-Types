import type { MinimalUserType } from './User';
import type { FeaturesID } from '../Feature';

export interface DBType_Workspace_Raw {
    ID: number;
    Name: string;
    Logo: string;
    Features: string; // JSON string
    Password: string; // Hash
    ReAuthInterval: number | null; // Interval in seconds for re-authentication (null = never, 0 = always)
    Created: number;
}

export interface DBType_Workspace {
    id: number; // Workspace ID (0 = self)
    name: string;
    logo: string;
    users: MinimalUserType[];
    features: FeaturesID[];
    reAuthInterval: number | null; // Interval in seconds for re-authentication (null = never, 0 = always)
    created: number;
}
