---
'styled-components': patch
---

An escaped `&` and a `&` inside a string stay as written in a selector, so `&.\[\&\>\*\]` and `&[title="a & b"]` match what they say. A selector whose only `&` is one of these is scoped under the component, as in `[title="a & b"] { color: red; }`.
