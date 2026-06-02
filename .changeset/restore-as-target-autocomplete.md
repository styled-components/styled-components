---
'styled-components': patch
---

Keep TypeScript attribute autocomplete working while you type props on a polymorphic styled component. When a component renders a different element through `as` (for example `as="video"`), beginning to type a new prop name could make the whole suggestion list vanish; the rendered element's props now keep autocompleting as you go.
