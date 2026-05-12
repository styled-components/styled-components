---
"styled-components": minor
---

React Native: sibling combinator selectors and the `:nth-child` family now work.

```jsx
const Card = styled.View`
  padding: 16px;
`;
const Divider = styled.View`
  height: 1px;
  ${Card} + & {
    margin-top: 8px;
  }
`;

const ListItem = styled.View`
  padding: 8px;
  &:nth-child(odd) {
    background-color: gainsboro;
  }
  &:first-child {
    border-top-width: 0;
  }
`;
```

Supported selector forms:

- Adjacent sibling: `${Component} + &`, fires when the immediately preceding styled sibling is the referenced component.
- General sibling: `${Component} ~ &`, fires when any preceding styled sibling is the referenced component.
- `:first-child`, `:last-child`, `:only-child`.
- `:nth-child(N)`, `:nth-child(an+b)`, `:nth-child(odd)`, `:nth-child(even)`.
- `:nth-last-child(...)` (same syntax as `:nth-child`, counting from the end).
- `:first-of-type`, `:last-of-type`, `:only-of-type`, `:nth-of-type(...)`, `:nth-last-of-type(...)`, count only same-element-type siblings.

These selectors operate on the styled component's literal JSX position among its parent's children. Plain wrappers (`View`, `Text`, host components) between the parent and a child are transparent: their children participate in the sibling chain as if rendered directly under the styled parent.
