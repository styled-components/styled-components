---
'styled-components': minor
---

React Native: `:not(...)` now works for simple selectors. Rules such as `:not(:hover)`, `:not(:focus)`, `:not([disabled])`, and `:not([data-state='loading'])` apply when the condition inside `:not()` is not true. More complex forms, including multiple selectors or nested descendant selectors, still show a development warning and are ignored on native.
