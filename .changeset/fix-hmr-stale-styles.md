---
'styled-components': patch
---

Fix stale styles during client-side HMR when module re-evaluation creates new component style instances while IDs remain stable (e.g., SWC plugin assigns IDs by file location).

Styled components now detect when the underlying `ComponentStyle` instance changes and invalidate the render cache, ensuring fresh style injection. `createGlobalStyle` additionally clears stale sheet entries when the `GlobalStyle` instance changes between renders.
