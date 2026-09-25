---
"styled-components": patch
---

Added a development-only warning for when the server and the browser are running different versions of styled-components. Class names are derived in part from the library's own version, so a mismatch made every server-rendered class name silently fail to match on the client, with no hint as to why styles disappeared or hydration broke. The warning names both versions and points at `npm ls styled-components` to find the duplicate. A page that intentionally hosts more than one app, each on its own styled-components version (for example a micro-frontend setup), can ignore it. It is stripped from production builds.
