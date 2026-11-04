---
'styled-components': patch
---

A quoted `font-family` or `font` name on iOS and Android reads its CSS escapes, so `"A\"B"` names the face `A"B` and a backslash before a line break continues the name. React Native for Web keeps sending the name as written, and the browser reads the escapes.
