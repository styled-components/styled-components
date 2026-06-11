---
'styled-components': patch
---

Slash-separated `border-radius` values that resolve to a circular radius (for example `10px / 10px`) are supported on native. Truly elliptical combinations are not supported: they are ignored with a development warning. Web builds keep the authored value.
