---
'styled-components': patch
---

The arity-2 `.attrs((props, ast) => ...)` callback now sees `ast` as a non-optional `CompiledAst`, so authors no longer need to optional-chain to satisfy the TypeScript compiler under `strict: true`. The arity-1 form (`.attrs((props) => ...)`) is unchanged.
