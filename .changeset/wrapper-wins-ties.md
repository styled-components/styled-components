---
'styled-components': patch
---

A component that wraps another on the same element, through `styled(X)`, `as={X}` or a `className` passed down, wins ties over the component it wraps, whatever their definition order or the order their code loads. This holds for server and client components alike, including a client-only `as={X}` and an inner component loaded lazily. Inherited rules carry the same specificity in server component, client and `ServerStyleSheet` output, and `${Base}` selectors keep matching every extension of `Base`.

Components that do not wrap one another follow definition order, server components before client components. Definition order is per process, so it can differ between server processes, between a build and a server, and after client navigation to a page another process rendered.

What is not ordered by the tree:

- When the same two components wrap each other in both directions (`<B as={A}>` on one page, `<A as={B}>` on another), the pair keeps definition order once both have rendered in one page load, and development warns once naming both. When one of the two extends the other's base, the base stays first.
- With streaming, a component first rendered in a later chunk sits after every component an earlier chunk already sent. This decides a tie only between components that do not wrap one another yet meet on one element through a selector that reaches another element, such as a parent's `& > *` against its child's own styles. Raise one side's specificity to fix the outcome.
- When a wrapping component moves after the one it wraps, it can pass unrelated components and change which of those it beats on ties.
- A move can change cascade layer order when the moved component holds a layer's first appearance. Declare the order up front with one `@layer` statement in a global style; development warns when a move changes it.
- A component selector (`${Component}`) across server and client modules matches only when both sides use the build plugin.
