---
'styled-components': patch
---

`text-wrap-mode` and `text-wrap-style` can now be set directly on React Native. Previously only the `text-wrap` shorthand was supported. `nowrap` clips text to a single line, and on Android, `balance` and `pretty` use the platform's higher-quality line breaking.
