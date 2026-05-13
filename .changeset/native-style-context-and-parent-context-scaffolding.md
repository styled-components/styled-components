---
'styled-components': minor
---

React Native container query hooks continue to work unchanged. Most apps do not need to change anything.

If your app manually renders the low-level container context provider from `styled-components/native`, update it to the new native style context provider exported from the same entrypoint. The provider now carries both container information and inherited style values needed by newer native CSS features.
