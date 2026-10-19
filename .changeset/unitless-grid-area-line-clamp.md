---
'styled-components': patch
---

Numbers for `gridArea` and `lineClamp` in object styles render without a unit, the same way React's inline `style` prop renders them:

```ts
const Item = styled.div({ gridArea: 2, lineClamp: 3 });
// grid-area: 2; line-clamp: 3;
```

Components that set either property to a number get a new class name on upgrade, since the emitted CSS changes.
