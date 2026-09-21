# @deveye/types

Les contrats partagés de [DevEye](https://github.com/Gerem66/DevEye) : types
TypeScript et schémas zod, consommés par le serveur, le client et les modules
de features.

Le package sert ses sources directement (`src/*.ts`, aucun build) :

- **`@deveye/types`** — le domaine transverse (espaces, rôles, live, partage…),
  les protocoles (enveloppe WS, agent), le registre d'identité des features.
- **`@deveye/types/sdk`** — le contrat des modules de features : `FeatureManifest`,
  `validateManifest`, ids `x-<slug>`.
- **`@deveye/types/sdk/server`** — le contexte serveur d'un module (handlers,
  store, façade, service).
- **`@deveye/types/sdk/client`** — les contrats de l'entrée client d'un module.
- **`@deveye/types/sdk/testing`** — le harnais de test en mémoire des handlers.

Le portrait typé du barrel `deveye-sdk-client` (le runtime que l'app fournit
aux modules) est publié ici aussi (`src/sdk/client-ambient.d.ts`) ; la CI de
DevEye vérifie mécaniquement que le vrai barrel l'honore.

Pour écrire un module : partir du
[template](https://github.com/Gerem66/DevEye-Feature-Template) et sa doc.

## Licence

[MIT](LICENSE). Un module bâti sur ce paquet se licencie comme son auteur
l'entend : le cœur de DevEye est sous AGPL-3.0, avec une exception pour ce qui
ne passe que par ce SDK (`LICENSING.md` du dépôt de l'app).
