---
"styled-components": patch
---

Fix url() CSS function values being incorrectly stripped when using unquoted URLs containing `//` (e.g., `url(https://example.com)`). The `//` in protocol URLs like `https://`, `http://`, `file://`, and protocol-relative URLs was incorrectly being treated as a JavaScript-style line comment.
