---
"styled-components": minor
---

Added a `StyledComponent<Target, Props>` type for annotating explicitly-typed styled component exports.

Packages that emit their own declaration files, including any project using `isolatedDeclarations`, must annotate every exported styled component, and there was no public type for it: consumers reached into internal paths or hand-assembled one that dropped members like a wrapped component's hoisted statics.

`StyledComponent` is exported from the web and native entries. Name the target and props as you passed them to `styled`:

```tsx
import styled, { type StyledComponent } from 'styled-components';

export const Card: StyledComponent<'div', { $active?: boolean }> = styled.div<{ $active?: boolean }>`...`;
export const CloseButton: StyledComponent<typeof IconButton> = styled(IconButton)`...`;
```

It resolves to the exact type `styled(Target)<Props>` produces, so the annotation is not lossy.
