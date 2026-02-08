---
'styled-components': patch
---

Revert `exports` field and restore browser/server build split with `browser` field in package.json. Fixes `require('stream')` resolution errors in browser bundlers like webpack 5.
