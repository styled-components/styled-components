---
'styled-components': patch
---

`text-wrap-mode` and `text-wrap-style` can now be set independently as their own properties on React Native (previously only the `text-wrap` shorthand was supported). Each longhand resolves to the same effective behavior as the shorthand path: `nowrap` clips to a single line; on Android, `balance` and `pretty` route through the platform's higher-quality line-breaking strategy.
