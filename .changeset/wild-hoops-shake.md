---
'styled-components': minor
---

Large TypeScript projects type-check dramatically faster. On a 500-component app, `tsc` check time drops to under a quarter of what 6.4.4 takes and peak memory to under a third, which resolves the out-of-memory failures some projects hit after upgrading past 6.4.2. Both are now better than 6.4.2 was, so there is no longer a reason to pin to it. Editor responsiveness improves by the same margin, and autocomplete on `as` targets is unchanged.
