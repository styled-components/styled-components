---
'styled-components': patch
---

In development, a console warning now appears when the browser finds server-rendered styles from a different styled-components version than the one running. Those styles were previously skipped without notice, which left class names stale and hydration mismatched. Make sure the server and the browser load the same version (`npm ls styled-components` lists duplicates).
