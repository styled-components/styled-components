---
'styled-components': patch
---

Each `createGlobalStyle` applies its own CSS when two global styles differ only in what their functions return, including bodies that are only a function (`createGlobalStyle\`${() => 'html { --a: 1; }'}\``). This is how a CSS reset and a color-mode style are often written together, for example xstyled's Preflight and ColorModeProvider. When both set the same property, the one mounted most recently wins, and a prop or theme update does not change which one that is.

When several mounts of one dynamic global style render on the server, the collected styles include every one of them, not only the last.
