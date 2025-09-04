// Authentification
import type { RequestLogin } from './Auth/login';

// Contexts
import type { RequestAddContext } from './Contexts/add-context';
import type { RequestDeleteContext } from './Contexts/delete-context';
import type { RequestSetFavoriteContext } from './Contexts/set-favorite-context';

// Passwords
import type { RequestAddPassword } from './PasswordManager/add-password';
import type { RequestEditPassword } from './PasswordManager/edit-password';
import type { RequestDeletePassword } from './PasswordManager/delete-password';
import type { RequestGetPassword } from './PasswordManager/get-password';
import type { RequestGetPasswords } from './PasswordManager/get-passwords';
import type { RequestCheckPassword } from './PasswordManager/check-password';

// GameLife
import type { RequestGamelifeSetLoop } from './GameLife/gamelife-set-loop';
// import type { RequestGamelifeData } from './gamelife-data';

export interface RequestCommands {
    // Authentification
    login: RequestLogin;

    // Contexts
    'add-context': RequestAddContext;
    'delete-context': RequestDeleteContext;
    'set-favorite-context': RequestSetFavoriteContext;

    // Passwords
    'add-password': RequestAddPassword;
    'edit-password': RequestEditPassword;
    'delete-password': RequestDeletePassword;
    'get-password': RequestGetPassword;
    'get-passwords': RequestGetPasswords;
    'check-password': RequestCheckPassword;

    // GameLife
    'gamelife-set-loop': RequestGamelifeSetLoop;
    // 'gamelife-data': RequestGamelifeData;
}
