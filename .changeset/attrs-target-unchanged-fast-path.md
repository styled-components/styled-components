---
'styled-components': patch
---

`.attrs()` on an element tag is cheaper to type-check.

Object-form `.attrs()` leaves the rendered target unchanged, but the types still re-resolved that target's whole prop bag on every `.attrs` call, which made `.attrs` on an HTML or SVG tag far more expensive to check than on a wrapped component. It now reuses the props already resolved for the tag, cutting consumer type-check instantiations measurably with no change to the resulting component's accepted props. Redirecting the target with `.attrs({ as })`, including the function form, is unaffected.
