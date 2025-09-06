import type { FeaturesID } from '../Feature';
import type { DBType_Workspace } from './Workspaces';

export interface DBType_User_Raw {
    ID: number;
    Email: string;
    Username: string;
    Password: string;
    ReAuthInterval: number | null; // Interval in seconds for re-authentication (null = never, 0 = always)
    Avatar: string;
    Features: string; // JSON string
    DefaultWorkspace: number;
    DefaultFeature: FeaturesID;
    Settings: string; // JSON string
    Token: string;
    LastLogin: number;
    Created: number;
}

export interface DBType_User {
    ID: number;
    Email: string;
    Username: string;
    Avatar: string;
    Workspaces: DBType_Workspace[];
    DefaultWorkspace: number; // ID of the default workspace (0 = self)
    DefaultFeature: FeaturesID;
    Settings: string[];
    Token: string;
    LastLogin: number;
    Created: number;
}

export interface MinimalUserType {
    ID: number;
    Email: string;
    Username: string;
    Avatar: string;
    Created: number;
}

export const DefaultUser: DBType_User = {
    ID: 0,
    Email: '',
    Username: '',
    Avatar: '',
    Settings: [],
    Created: 0,
    LastLogin: 0,
    Workspaces: [],
    DefaultWorkspace: 0,
    DefaultFeature: 'dashboard',
    Token: ''
};
