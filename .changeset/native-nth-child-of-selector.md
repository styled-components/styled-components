---
'styled-components': minor
---

React Native: `:nth-child(an+b of S)` and `:nth-last-child(an+b of S)` are supported. The formula counts position within the filter, so `:nth-child(2n+1 of [data-active])` selects every odd active sibling regardless of inactive siblings between them. The `of S` inner accepts a styled component reference or a single attribute selector (the same simple-selector forms `:has()` accepts on native). Complex inner selectors with combinators or descendant chains warn and fall through.

```tsx
const Row = styled.View`
  background: white;
  &:nth-child(2n + 1 of [data-active]) {
    background: silver;
  }
`;
```
