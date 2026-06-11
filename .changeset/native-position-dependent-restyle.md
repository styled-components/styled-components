---
'styled-components': patch
---

React Native: position-dependent styles (`:nth-child`, sibling combinators) re-evaluate when a sibling insertion, removal, or reorder shifts an element's position, even when its own props are unchanged. An `:nth-child(2)` highlight, for example, follows the element that actually sits in the second slot.
