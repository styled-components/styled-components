---
"styled-components": patch
---

Inlined the prop validator that decides which props reach the underlying DOM element. styled-components no longer pulls `@emotion/is-prop-valid` from npm; the same validation logic ships inside the library itself. Consumers see a smaller dependency tree and a slightly smaller installed footprint, with identical behavior.

If you were already importing `isPropValid` from `@emotion/is-prop-valid` directly elsewhere in your app, that continues to work; this change only affects what styled-components itself depends on.
