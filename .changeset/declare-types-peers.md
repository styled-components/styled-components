---
"styled-components": patch
---

Declared `@types/react`, `@types/react-dom` and `@types/node` as optional peer dependencies, so strict package managers can now resolve the type packages the shipped declarations use.

The published `.d.ts` files reference React's types, `PipeableStream` from `react-dom/server`, and the `NodeJS` stream globals, but the package never declared any of them. Under a hoisted `node_modules` those imports resolve by accident, from the consuming app's own tree. Under an isolated dependency layout (pnpm's default linker, or npm's `--install-strategy=nested`) they do not, because a type checker resolves a package's imports from where that package physically lives. `react` then lands on the untyped `react/index.js` and every styled component's props degrade to `any`. The optional peers close that gap; a JavaScript-only project still installs without an unmet-peer warning.
