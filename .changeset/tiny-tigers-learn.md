---
'styled-components': patch
---

fix for React Native >=0.79 crashes when using unsupported web-only CSS values (e.g., fit-content, min-content, max-content). The fix emits a warning and ignores the property using those values, instead of causing crashes.
