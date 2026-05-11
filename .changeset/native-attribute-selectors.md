---
"styled-components": minor
---

React Native: attribute selectors now apply styles based on the rendered element's props.

```jsx
const Toggle = styled.Pressable`
  background: white;
  &[aria-pressed='true'] {
    background: yellow;
  }
`;

<Toggle aria-pressed={true} /> // yellow background
```

The same CSS works on web and native. This is most useful for `aria-*` selectors since React Native forwards those to platform accessibility services. The presence-only form `&[attr]` matches whenever the prop is defined. The exact-match forms `&[attr=value]`, `&[attr='value']`, and `&[attr="value"]` compare as strings, with boolean coercion so `aria-pressed={true}` and `aria-pressed="true"` both apply the rule. Other operators (`~=`, `^=`, `$=`, `*=`, `|=`) are not supported on native.
