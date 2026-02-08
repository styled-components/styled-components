---
'styled-components': patch
---

In RSC environments, `theme` is now `undefined` instead of `{}` for styled components, matching the existing behavior of `withTheme` and `createGlobalStyle`. This ensures accessing theme properties without a ThemeProvider correctly throws rather than silently returning `undefined`.
