---
'styled-components': patch
---

Interpolated values stay inside their component's styles, including in templates that contain comments. An unmatched `}` in an interpolated value and the rest of its statement are dropped, so a value like `red; } body { background: red }` cannot add a global rule.

An interpolated value that nests blocks thousands of levels deep no longer crashes rendering; the over-deep block is dropped and the rest of the component's styles apply.

Templates with a very large number of comments are processed in time proportional to their length.
