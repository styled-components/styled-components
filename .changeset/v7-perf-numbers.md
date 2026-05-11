---
"styled-components": minor
---

Performance improvements across the board in v7. Component creation, SSR `renderToString`, and React Server Components rendering are all faster than v6, with SSR seeing the largest gains at scale. The eager-parse strategy folds template-literal work into construction time so renders pay less.

To measure on your hardware:

```sh
pnpm --filter @styled-components/benchmarks bench:headless
```
