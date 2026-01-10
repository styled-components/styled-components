---
'styled-components': patch
---

fix: include TypeScript declaration files in npm package

Fixed Rollup TypeScript plugin configuration to override tsconfig.json's noEmit setting, ensuring TypeScript declaration files are generated during build.
