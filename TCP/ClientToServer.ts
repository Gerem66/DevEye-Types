import type { FeaturesID } from '../Feature';
import type { PasswordType } from '../Password';

export interface RequestClientToServer {
    login: { token: string; password: string | null };
    'check-password': { contextID: number; password: string };
    'get-passwords': { contextID: number };
    'get-password': { contextID: number; passwordID: number };
    'add-password': { contextID: number; password: PasswordType };
    'edit-password': { contextID: number; password: PasswordType };
    'delete-password': { contextID: number; passwordID: number };
    'add-context': { contextName: string };
    'delete-context': { contextID: number };
    'change-favorite-context': { contextID: number; featureID: FeaturesID };
    'gamelife-set-loop': { contextID: number; type: 'open' | 'close'; intervalID?: string };
}
