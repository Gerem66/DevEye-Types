# @deveye/types

The shared contracts of [DevEye](https://github.com/Gerem66/DevEye): TypeScript
types and zod schemas, consumed by the server, the client and the feature
modules.

The package ships its sources as is (`src/*.ts`, no build step). Its entries,
as `package.json` exports them:

- **`@deveye/types`**: the cross-cutting domain (workspaces, roles, live
  presence, sharing...), the protocols (WebSocket envelope, errors, agent) and
  the feature identity registry.
- **`@deveye/types/sdk`**: the contract of a feature module: `FeatureManifest`
  and `validateManifest`, the `x-<slug>` ids, the provider contracts modules
  offer one another, the look of a public page, the device a form offers as a
  relay.
- **`@deveye/types/sdk/server`**: what a module's handlers and background
  service receive (context, store, facade, service deps), plus the server
  helpers (SSRF guard, environment spec, domain names, item copy and move, the
  holder's data export, sealed file container, device relay, download headers).
- **`@deveye/types/sdk/client`**: the contracts of a module's client entry.
- **`@deveye/types/sdk/testing`**: the in-memory harness for handlers,
  services and domain hooks.

The typed portrait of `deveye-sdk-client`, the runtime barrel the app provides
to modules, is published here too (`src/sdk/client-ambient.d.ts`); DevEye's CI
checks mechanically that the real barrel honours it.

To write a module, start from the
[template](https://github.com/Gerem66/DevEye-Feature-Template) and its docs.

## License

[MIT](LICENSE). A module built on this package is licensed as its author sees
fit: DevEye's core is AGPL-3.0, with an additional permission for what reaches
the app only through this SDK
([`LICENSING.md`](https://github.com/Gerem66/DevEye/blob/main/LICENSING.md) in
the app's repository).
