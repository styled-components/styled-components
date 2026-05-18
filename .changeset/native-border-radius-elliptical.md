---
'styled-components': patch
---

Slash-separated `border-radius` values that are still circular (for example `10px / 10px`) now render on native. Truly elliptical combinations are ignored with a development warning instead of painting incorrect corners. Web builds keep the authored value.
