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

- Adjacent sibling: `${Component} + &`, which applies when the sibling element right before it is the referenced component.
- General sibling: `${Component} ~ &`, which applies when any earlier sibling element is the referenced component.
- `:first-child`, `:last-child`, `:only-child`.
- `:nth-child(N)`, `:nth-child(an+b)`, `:nth-child(odd)`, `:nth-child(even)`.
- `:nth-last-child(...)` (same syntax as `:nth-child`, counting from the end).
- `:first-of-type`, `:last-of-type`, `:only-of-type`, `:nth-of-type(...)`, and `:nth-last-of-type(...)`, which count siblings of the same element type, styled or not (a plain `View` and a `styled.View` are one type).
- `:nth-child(an+b of S)` and `:nth-last-child(an+b of S)`: the formula counts position within the filter, so `:nth-child(2n+1 of [data-active])` selects every odd active sibling regardless of inactive siblings between them. The `of S` inner accepts a styled component reference or a single attribute selector (the same simple-selector forms `:has()` accepts on native); complex inner selectors with combinators or descendant chains warn and fall through.

These selectors follow the component's JSX position among its sibling elements, and regular React Native components count as siblings, as every element does in a browser: in `<Card /><View /><Divider />`, `${Card} + &` does not apply to `Divider`. Text, `null` and booleans are not counted, arrays and Fragments are counted through, and anything else (a regular component whatever it renders, a `Suspense` boundary, a portal, a generator) counts as one element. A styled component nested inside its own kind gives its children their own positions. `background-blend-mode` layers never count as children.

A regular sibling keeps its state when a styled sibling appears before it or leaves, so a focused `TextInput` stays focused when an error label mounts beside it.

Position-dependent styles (`:nth-child`, sibling combinators) re-evaluate when a sibling insertion, removal, or reorder shifts an element's position, even when its own props are unchanged. An `:nth-child(2)` highlight, for example, follows the element that actually sits in the second slot.
