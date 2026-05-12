---
'styled-components': minor
---

React Native: `:not(<simple-selector>)` now applies. Simple arguments like `:not(:hover)`, `:not(:focus)`, `:not([disabled])`, and `:not([data-state='loading'])` invert the inner predicate, so the rule fires when the inner selector does NOT match. Complex or multi-argument forms (`:not(:hover, :focus)`, descendant combinators inside `:not`) still warn and drop.
