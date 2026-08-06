---
'styled-components': patch
---

Styled components now report the same debug value to React DevTools on every render. Previously the value was only reported on renders that recomputed styles, so it disappeared from the DevTools panel whenever a component re-rendered with unchanged style props.
