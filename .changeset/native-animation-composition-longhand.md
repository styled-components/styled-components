---
'styled-components': patch
---

Fixed native parsing of comma-separated `animation-composition` so each value pairs with the matching `animation-name` entry when you run multiple animations, instead of treating the whole declaration as a single invalid keyword.
