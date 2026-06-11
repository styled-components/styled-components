---
'styled-components': patch
---

React Native: `font-style: oblique` maps to `italic`; an angle triggers a development warning. Standalone `line-height` (percentages, `em`, `rem`) and relative `letter-spacing` that are not supported warn with suggested replacements; percentage line height inside the `font` shorthand resolves when font size is known. On the web, browser-handled values are kept.
