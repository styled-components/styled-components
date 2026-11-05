---
'styled-components': major
---

Splitting a block across a value and its template has been removed in favor of writing the whole block in one place. A template that leaves `calc(`, a string, or a bracket open for a value to close is dropped from that point, and development builds warn about it. A paren, string, or bracket that a value opens can close later in the same declaration, as in `width: ${'calc('}1px${')'};`.
