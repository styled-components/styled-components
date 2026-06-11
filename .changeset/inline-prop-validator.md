---
'styled-components': patch
---

The prop-filtering logic that decides which props reach the underlying DOM element ships inside styled-components, with no `@emotion/is-prop-valid` dependency. Consumers get a smaller dependency tree and a slightly smaller installed footprint, with identical filtering behavior.

Importing `isPropValid` from `@emotion/is-prop-valid` directly elsewhere in your app still works; this only affects what styled-components itself depends on.
