---
'styled-components': patch
---

Each `createGlobalStyle` applies its own CSS when two global styles differ only in what their functions return, including bodies that are only a function (`createGlobalStyle\`${() => 'html { --a: 1; }'}\``). This is how a CSS reset and a color-mode style are often written together, for example xstyled's Preflight and ColorModeProvider.
