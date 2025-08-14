import type { UserType } from '../User';
import type { ContextType } from '../Context';
import type { PasswordType } from '../Password';

export interface RequestServerToClient {
    login: { status: number; user: UserType | null };
    'check-password': { status: number; message: string | null };
    'get-passwords': { status: number; passwords: Array<PasswordType> };
    'get-password': { status: number; password: PasswordType | null };
    'add-password': { status: number; password: PasswordType | null };
    'edit-password': { status: number; password: PasswordType | null };
    'delete-password': { status: number };
    'add-context': { status: number; context: ContextType | null };
    'delete-context': { status: number };
    'change-favorite-context': { status: number };
    'gamelife-set-loop': { status: number; intervalID: string };
    'gamelife-data': { status: number; totalUserCount: number };
}
