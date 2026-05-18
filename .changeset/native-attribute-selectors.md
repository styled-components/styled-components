---
'styled-components': minor
---

React Native: attribute selectors now apply styles based on the rendered element's props.

```jsx
const Toggle = styled.Pressable`
  background: white;
  &[aria-pressed='true'] {
    background: yellow;
  }
`;

<Toggle aria-pressed={true} />; // yellow background
```

The same CSS works on web and native. This is especially useful for `aria-*` props, since React Native passes them to platform accessibility services. Presence checks like `&[attr]` match when the prop is defined, and exact matches like `&[attr='value']` compare the rendered prop value as text, so `aria-pressed={true}` and `aria-pressed="true"` both match `[aria-pressed='true']`. Substring, prefix, suffix, word, and case-insensitive matches are supported too.
