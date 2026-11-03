---
'styled-components': patch
---

Interpolated values stay inside their component's styles, including in templates that contain comments. An unmatched `}` in an interpolated value and the rest of its statement are dropped, so a value like `red; } body { background: red }` cannot add a global rule.

Templates with a very large number of comments are processed in time proportional to their length.
