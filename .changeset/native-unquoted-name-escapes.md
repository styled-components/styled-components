---
'styled-components': patch
---

An unquoted `font-family` or `font` name on iOS, Android, and React Native for Web reads its CSS escapes, so `A\42 B` names the face `ABB` and `\73 erif` is the generic keyword `serif`. A keyword spelled with an escape also reads correctly in shorthands such as `font` and `border`. Properties that reach React Native as written, such as `color`, keep the escape as authored, and an escape inside a unit (`10\70 x`) isn't read.
