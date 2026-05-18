---
'styled-components': patch
---

`object-fit` on a styled Image now applies correctly across iOS, Android, and the web. Previously the value reached the underlying Image differently on each target, leaving the web bar without the requested fit.
