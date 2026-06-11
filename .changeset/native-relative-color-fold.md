---
'styled-components': minor
---

React Native: relative color syntax is supported. You can write values like `oklch(from #f00 calc(l - 0.15) c h)` to derive a new color from a base color, and styled-components renders the result consistently on iOS, Android, and the web. The `oklch`, `oklab`, `lch`, and `lab` forms are supported.

The base color can be a literal color, another modern color function, or a theme value such as `oklch(from ${theme.colors.brand} calc(l - 0.15) c h)`. That makes it possible to build lighter, darker, or more transparent variants from one source color without maintaining a separate shade table.
