---
'styled-components': patch
---

Fix RSC style tag accumulation across HMR cycles. The module-level stylesheet singleton now resets once per server render via `React.cache`, preventing stale CSS from previous edits from persisting. Keyframe rules are emitted in a dedicated `<style>` tag with separate deduplication.
