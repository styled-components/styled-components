---
'styled-components': minor
---

A declared `style` type now constrains the fields it names and leaves the rest of CSS accepted, instead of replacing the target's `style` outright. Wrap the declaration in the new `CustomStyle` export to forbid everything it omits rather than writing `never` for every property by hand. The constraint holds through `as` and `forwardedAs`.

Under `exactOptionalPropertyTypes` a component with a declared `style` rejects an explicit `style={undefined}`; declare `style?: X | undefined` to allow it. Omitting the prop is unaffected.
