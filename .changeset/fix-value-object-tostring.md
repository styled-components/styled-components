---
"styled-components": patch
---

Respect a custom `toString` on plain value objects (e.g. design tokens) when interpolated into a styled component, rather than walking the object's keys as CSS declarations.
