---
'styled-components': patch
---

Development warnings say what to do about the problem they report. Each one names the construct that triggered it and ends with a concrete fix, for example "Wrap the tree in a `<ThemeProvider theme={...}>` or pass a theme prop." for `withTheme`, or "Load the stylesheet with a `<link>` tag instead" for `@import` inside `createGlobalStyle`. Production builds are unaffected; these messages only appear in development.
