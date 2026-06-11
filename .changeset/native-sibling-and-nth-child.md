---
'styled-components': minor
---

React Native: sibling combinator selectors and the `:nth-child` family are supported.

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

Supported selector forms include:

- Adjacent sibling: `${Component} + &`, which applies when the previous styled sibling is the referenced component.
- General sibling: `${Component} ~ &`, which applies when any earlier styled sibling is the referenced component.
- `:first-child`, `:last-child`, `:only-child`.
- `:nth-child(N)`, `:nth-child(an+b)`, `:nth-child(odd)`, `:nth-child(even)`.
- `:nth-last-child(...)` (same syntax as `:nth-child`, counting from the end).
- `:first-of-type`, `:last-of-type`, `:only-of-type`, `:nth-of-type(...)`, and `:nth-last-of-type(...)`, which count siblings of the same element type.

These selectors follow the component's JSX position among its siblings. Regular React Native components can sit between styled components without breaking selector matching.
