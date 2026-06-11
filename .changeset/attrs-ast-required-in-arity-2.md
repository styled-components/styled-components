---
'styled-components': patch
---

The arity-2 `.attrs((props, ast) => ...)` callback receives `ast` as a non-optional `CompiledAst`, so authors can read it directly without optional-chaining under TypeScript `strict: true`. The arity-1 form (`.attrs((props) => ...)`) takes only `props`.
