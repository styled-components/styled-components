---
'styled-components': patch
---

Fix RSC restyling specificity when extending client components across the server/client boundary, and prevent duplicate keyframe CSS in SSR output.

- RSC components extending client components now correctly override base styles via plain inline `<style>` tags and `:where()` zero-specificity wrapping on base CSS
- Keyframe IDs are deduplicated (Set instead of array), preventing duplicate `@keyframes` rules in SSR output
