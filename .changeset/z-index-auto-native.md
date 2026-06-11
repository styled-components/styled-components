---
'styled-components': major
---

React Native: `z-index: auto` resolves to the platform default stacking (the behavior CSS defines for `auto`) on iOS and Android, and passes through to the browser on the web.
