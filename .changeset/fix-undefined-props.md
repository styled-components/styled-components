---
"styled-components": patch
---

Preserve explicitly passed `undefined` props instead of stripping them. This fixes compatibility with libraries like MUI and Radix UI that pass `undefined` to reset inherited defaults (e.g., `role={undefined}`). Props set to `undefined` via `.attrs()` are still stripped as before.
