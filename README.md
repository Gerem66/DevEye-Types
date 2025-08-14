# DevEye-Types

Ce package contient toutes les définitions de types TypeScript pour le projet DevEye.

## Installation

```bash
npm install
```

## Compilation

```bash
npm run build
```

## Développement avec watch mode

```bash
npm run dev
```

## Structure

- `Context.ts` - Types pour les contextes
- `Feature.ts` - Types pour les fonctionnalités
- `GameLife.ts` - Types pour GameLife
- `HTTP.ts` - Types pour les endpoints HTTP
- `Password.ts` - Types pour les mots de passe
- `User.ts` - Types pour les utilisateurs
- `TCP/` - Types pour la communication TCP
  - `ClientToServer.ts` - Requêtes client vers serveur
  - `ServerToClient.ts` - Réponses serveur vers client
  - `TCP.ts` - Types génériques TCP
- `index.ts` - Exports principaux

## Utilisation

```typescript
import { UserType, ContextType, PasswordType } from 'deveye-types';
```

Les fichiers compilés sont disponibles dans le dossier `dist/`.
