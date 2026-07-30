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
- `:nth-child(an+b of S)` and `:nth-last-child(an+b of S)`: the formula counts position within the filter, so `:nth-child(2n+1 of [data-active])` selects every odd active sibling regardless of inactive siblings between them. The `of S` inner accepts a styled component reference or a single attribute selector (the same simple-selector forms `:has()` accepts on native); complex inner selectors with combinators or descendant chains warn and fall through.

These selectors follow the component's JSX position among its siblings. Regular React Native components can sit between styled components without breaking selector matching.

Position-dependent styles (`:nth-child`, sibling combinators) re-evaluate when a sibling insertion, removal, or reorder shifts an element's position, even when its own props are unchanged. An `:nth-child(2)` highlight, for example, follows the element that actually sits in the second slot.
