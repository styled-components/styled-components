---
'styled-components': minor
---

React Native supports `:not(<simple-selector>)`. Rules such as `:not(:hover)`, `:not(:focus)`, `:not([disabled])`, and `:not([data-state='loading'])` apply when the inner condition does not match. More complex forms, including multiple selectors or nested descendant selectors, are not supported on native: they show a development warning and are ignored.
