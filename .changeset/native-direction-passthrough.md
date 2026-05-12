---
'styled-components': patch
---

`direction: ltr | rtl` now lands on React Native styles. Logical edges (`margin-inline-start` / `padding-inline-end` / etc.) flip sides under `rtl`, so a single declaration steers bidi-aware layout on iOS, Android, and the web.
