import type { FeaturesID } from './Feature';
import type { ContextType } from './Context';

export interface DBUserType {
    ID: number;
    Email: string;
    Username: string;
    Password: string;
    ReAuthInterval: number | null; // Interval in seconds for re-authentication (null = never, 0 = always)
    Avatar: string;
    Features: string; // JSON string
    DefaultContext: number;
    DefaultFeature: FeaturesID;
    Settings: string; // JSON string
    Token: string;
    LastLogin: number;
    Created: number;
}

export interface UserType {
    ID: number;
    Email: string;
    Username: string;
    Avatar: string;
    Contexts: ContextType[];
    DefaultContext: number; // ID of the default context (0 = self)
    DefaultFeature: FeaturesID;
    Settings: string[];
    Token: string;
    LastLogin: number;
    Created: number;
}

export interface TCPUserType {
    ID: number;
    Email: string;
    Username: string;
    Avatar: string;
    Created: number;
}

export const DefaultUser: UserType = {
    ID: 0,
    Email: '',
    Username: '',
    Avatar: '',
    Settings: [],
    Created: 0,
    LastLogin: 0,
    Contexts: [],
    Token: '',
    DefaultContext: 0,
    DefaultFeature: 'dashboard'
};
