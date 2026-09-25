---
"styled-components": patch
---

styled-components now installs the stylis type declarations its own published types rely on.

The shipped declarations reference types from `stylis` (the `stylisPlugins` option and `stylisPluginRSC`), and `stylis` ships no types of its own. With `skipLibCheck` turned off, a project that had not installed `@types/stylis` itself could fail to type-check with an error inside styled-components' declarations. Nothing changes at runtime.
