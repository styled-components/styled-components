---
'styled-components': patch
---

Fixed a protocol-relative value after a colon being removed as a `//` line comment. `--cdn: //cdn.example.com/x.png;` now keeps its value, with or without whitespace between the colon and the slashes.
