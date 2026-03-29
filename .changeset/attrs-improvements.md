---
'styled-components': minor
---

`.attrs()` improvements: props supplied via attrs are now automatically made optional on the resulting component (previously required even when attrs provided a default). Also fixes a bug where the attrs callback received a mutable props object that could be changed by subsequent attrs processing; it now receives an immutable snapshot.
