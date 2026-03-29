---
'styled-components': patch
---

Fix RSC style injection: deduplicate inline `<style>` tags per render via `React.cache`, prevent stale CSS accumulating across HMR cycles by resetting the module-level sheet once per server render, and fix specificity when extending client components across the RSC boundary (`:where()` zero-specificity wrapping on base CSS, `Set`-based keyframe dedup).
