---
'styled-components': patch
---

The published package no longer ships a stray copy of the React Native development dependencies under `native/node_modules`, which made the install roughly 60 MB larger than the library itself. It also drops `test-utils/`, the repository's own test helpers, which import modules the package does not include and so could not be loaded from an install.
