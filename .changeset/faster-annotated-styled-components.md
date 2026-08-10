---
'styled-components': patch
---

Explicitly annotated styled components type-check faster.

Assigning a styled component to an explicit type, as `isolatedDeclarations` and any package that emits `.d.ts` files must (`const Button: IStyledComponentBase<'web', ...> = styled.button``), used to be several times more expensive to check than an inferred one, because the annotation's `style` and the component's widened `style` were two different csstype representations that the checker compared property by property.

The inline `style` widening now builds on React's own `CSSProperties`, the same type a hand-written annotation carries, so that comparison short-circuits. On a 40-component fixture this cut the types created for the annotated pattern by about 21%, with no change to what `style` accepts: CSS custom properties, a component's own narrow `style`, and `style={undefined}` all behave exactly as before.
