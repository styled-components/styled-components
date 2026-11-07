---
'styled-components': patch
---

A `style` returned from `attrs` reaches React Native components.

```tsx
const Badge = styled.View.attrs({ style: { opacity: 0.8 } })`
  padding: 4px;
`;

<Badge style={{ backgroundColor: 'red' }} />; // padding, red background, and opacity 0.8
```

- The attrs `style` layers over the `style` the component is given, so both apply and the attrs value wins a key both set, as on web.
- The component's `!important` declarations still win over either.
- Arrays and function styles (such as a `Pressable`'s) on either side are kept, and a function style is called with the current press state.
