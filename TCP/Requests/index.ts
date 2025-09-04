// Authentification
import type { RequestLogin } from './login';

// Contexts
import type { RequestAddContext } from './add-context';
import type { RequestDeleteContext } from './delete-context';
import type { RequestSetFavoriteContext } from './set-favorite-context';

// Passwords
import type { RequestAddPassword } from './add-password';
import type { RequestEditPassword } from './edit-password';
import type { RequestDeletePassword } from './delete-password';
import type { RequestGetPassword } from './get-password';
import type { RequestGetPasswords } from './get-passwords';
import type { RequestCheckPassword } from './check-password';

// GameLife
import type { RequestGamelifeSetLoop } from './gamelife-set-loop';
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
