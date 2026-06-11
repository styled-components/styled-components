---
'styled-components': major
---

React Native: `isolation: isolate` is supported on iOS, Android, and the web. Blended descendants (`mix-blend-mode`) composite against the isolated element's own group, matching across all three targets. Separately, when a `filter` on iOS uses effects the platform only renders at the experimental release level, development builds warn that the effect is invisible and that it suspends descendant `mix-blend-mode` compositing while mounted.
