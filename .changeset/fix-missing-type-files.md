---
'styled-components': patch
---

fix: ensure TypeScript declaration files are included in npm package

The Rollup TypeScript plugin was not overriding the `noEmit: true` setting from tsconfig.json, which prevented TypeScript declaration files (.d.ts) from being generated during the build process. This has been fixed by explicitly setting `noEmit: false` and `declaration: true` in the Rollup plugin configuration.

Additionally, added modern "exports" field to package.json for better module resolution in modern bundlers and Node.js environments.
