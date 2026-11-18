---
'styled-components': patch
---

Declared the type-only dependencies of the shipped `.d.ts` files: `@types/react`, `@types/react-dom` and `@types/node` are now optional peer dependencies.

The published types import React's types, `PipeableStream` from `react-dom/server`, and the `NodeJS` stream globals, but never declared any of them. A hoisted `node_modules` resolves those from the consuming app by accident. An isolated layout — pnpm's default linker or its global virtual store, `npm install --install-strategy=nested` — does not, because TypeScript resolves a package's imports from where that package physically lives. `react` then lands on the untyped `react/index.js`, every styled component's props degrade to `any`, and `noImplicitAny` consumers get errors that `skipLibCheck` had been hiding.

The peers are optional, so JavaScript-only projects get no unmet-peer warning.
