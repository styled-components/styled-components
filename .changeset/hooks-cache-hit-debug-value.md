---
'styled-components': patch
---

Styled components report the same debug value to React DevTools on every render. The value was reported only on renders that recomputed styles, so it disappeared from the DevTools panel whenever a component re-rendered with unchanged style props.
