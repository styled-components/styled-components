---
"styled-components": patch
---

fix: RSC style tags for extended components have correct href and include base CSS (#5663)

- Fix spaces in `<style href>` attribute that caused React 19 hydration failures when using `styled()` inheritance
- Fix missing base component CSS in RSC output when only the extended component renders
- Emit a separate `<style>` tag per inheritance level with content-aware hrefs, enabling React 19 deduplication of shared base styles
- Preserve correct CSS ordering (base before extended) for proper specificity override behavior
