---
'styled-components': patch
---

styled-components no longer pulls `@emotion/is-prop-valid` from npm; the same prop-filtering logic that decides which props reach the underlying DOM element now ships inside the library. Consumers see a smaller dependency tree and a slightly smaller installed footprint, with identical behavior.

If you were importing `isPropValid` from `@emotion/is-prop-valid` directly elsewhere in your app, that continues to work; this change only affects what styled-components itself depends on.
