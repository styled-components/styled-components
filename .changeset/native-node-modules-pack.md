---
'styled-components': patch
---

The published package no longer ships a stray copy of the React Native development dependencies under `native/node_modules`, which made the install roughly 60 MB larger than the library itself.
