---
'styled-components': patch
---

Large TypeScript projects type-check dramatically faster. On a 500-component app, `tsc` check time drops to about a third of what 6.4.4 takes and peak memory to about a third, which resolves the out-of-memory failures some projects hit after upgrading past 6.4.2. Editor responsiveness improves by the same margin, and autocomplete on `as` targets is unchanged.
