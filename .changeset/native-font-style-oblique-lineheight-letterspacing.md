---
'styled-components': patch
---

`font-style: oblique` maps to `italic` on React Native; an angle triggers a one-time development warning. Unsupported standalone `line-height` (percentages, `em`, `rem`) and relative `letter-spacing` warn with suggested replacements; percentage line height inside the `font` shorthand resolves when font size is known. Web builds keep browser-handled values.
