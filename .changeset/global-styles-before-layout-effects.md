---
'styled-components': minor
---

`createGlobalStyle` rules land before any consumer layout effect.

Global styles now write from an insertion effect, which React runs for the whole tree before any layout effect. A component measuring itself in `useLayoutEffect` reads the styled measurement, where before it could read the unstyled one depending on where the global style component sat in the tree.

If you were compensating for that ordering, for example by measuring in a passive effect or on a later tick, that workaround can come out.
