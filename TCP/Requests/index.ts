import type { RequestLogin } from './login';
import type { RequestCheckPassword } from './check-password';
import type { RequestGetPassword } from './get-password';
import type { RequestGetPasswords } from './get-passwords';
import type { RequestAddPassword } from './add-password';
import type { RequestEditPassword } from './edit-password';
import type { RequestDeletePassword } from './delete-password';
import type { RequestAddContext } from './add-context';
import type { RequestDeleteContext } from './delete-context';
import type { RequestChangeFavoriteContext } from './change-favorite-context';
import type { RequestGamelifeSetLoop } from './gamelife-set-loop';
import type { RequestGamelifeData } from './gamelife-data';

export interface RequestCommands {
    login: RequestLogin;
    'check-password': RequestCheckPassword;
    'get-passwords': RequestGetPasswords;
    'get-password': RequestGetPassword;
    'add-password': RequestAddPassword;
    'edit-password': RequestEditPassword;
    'delete-password': RequestDeletePassword;
    'add-context': RequestAddContext;
    'delete-context': RequestDeleteContext;
    'change-favorite-context': RequestChangeFavoriteContext;
    'gamelife-set-loop': RequestGamelifeSetLoop;
    'gamelife-data': RequestGamelifeData;
}
