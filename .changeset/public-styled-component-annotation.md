---
"styled-components": minor
---

Added a `StyledComponent<Target, Props>` type for annotating explicitly-typed styled component exports.

Packages that emit their own declaration files, including any project using TypeScript's `isolatedDeclarations`, must give every exported styled component a written type annotation, because inference alone does not survive declaration emit. There was no public type for this, so consumers reached into internal paths (`styled-components/dist/types`) or hand-assembled an approximation that quietly dropped members such as a wrapped component's hoisted statics.

`StyledComponent` is now exported from both the web and React Native entries. You write it by naming the target and props exactly as you passed them to `styled`:

```tsx
import styled, { type StyledComponent } from 'styled-components';

export const Card: StyledComponent<'div', { $active?: boolean }> = styled.div<{ $active?: boolean }>`...`;
export const CloseButton: StyledComponent<typeof IconButton> = styled(IconButton)`...`;
```

It resolves to the exact type `styled(Target)<Props>` produces, so the annotation is not lossy and the check against the inferred component stays cheap.
