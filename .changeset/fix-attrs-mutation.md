---
"styled-components": patch
---

Fix `.attrs()` callback receiving a mutable props object that could be changed by subsequent attrs processing. The callback now receives an immutable snapshot.
