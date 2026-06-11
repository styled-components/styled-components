---
'styled-components': minor
---

React Native supports the `:has(<simple>)` selector.

```jsx
const Card = styled.View`
  padding: 16px;
  &:has(${Icon}) {
    padding-left: 48px;
  }
  &:has([data-state='active']) {
    background-color: tomato;
  }
`;

<Card>
  <Icon />
</Card>;
```

The rule checks the component's children at render time and applies when any descendant matches. Two forms are supported on native:

- `${Component}`: matches when the referenced styled component appears anywhere inside.
- `[attr]` and `[attr=value]`: match when any descendant has the named prop. Value checks compare the rendered prop value as text, so `aria-pressed={true}` and `aria-pressed="true"` both match `[aria-pressed='true']`.

More complex selectors inside `:has()`, such as descendant chains, sibling selectors, and nested `:has()` calls, are not supported on native.
