---
'styled-components': patch
---

React Native: several CSS constructs that platform primitives can't render emit a clear development warning with a suggested alternative. This covers conic gradients (`conic-gradient()` / `repeating-conic-gradient()`), the `order` property, `text-decoration-thickness` / `text-underline-offset` / `text-underline-position`, and the advanced `text-overflow` forms (string, `fade`, and two-value). Each warning names the construct, explains why it can't run on iOS or Android, and points at a workaround. The web renders all of these natively.
