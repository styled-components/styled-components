---
"styled-components": minor
---

React Native: `:has(<simple>)` selector now works.

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
</Card>
```

The match reads the component's own children subtree at render time and fires when any descendant satisfies the inner predicate. Two inner forms are supported on native:

- `${Component}`: matches when the referenced styled component appears anywhere in the subtree, recursively (a plain wrapper between the card and the icon is fine).
- `[attr]` / `[attr=value]`: matches when any descendant carries the named prop. Presence form fires for any non-undefined value; value form compares as a string, with boolean coercion so `aria-pressed={true}` and `aria-pressed="true"` both satisfy `[aria-pressed='true']`.

Complex inner selectors (descendant chains, sibling combinators, `:not(:has(...))`) are out of scope for this release.
