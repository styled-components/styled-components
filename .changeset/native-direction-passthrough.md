---
'styled-components': patch
---

`direction: ltr` and `direction: rtl` now work in React Native styles. Logical edges such as `margin-inline-start` and `padding-inline-end` follow that direction, so the same declaration can support left-to-right and right-to-left layouts on iOS, Android, and the web.
