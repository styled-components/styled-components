---
'styled-components': minor
---

React Native components now check `style` against React Native's own style types. Web-only CSS such as `float`, and CSS custom properties such as `--brand`, were previously accepted even though React Native has never done anything with them at runtime. They now surface as a type error where you write them instead of silently doing nothing.

```tsx
const Card = styled.View``;

<Card style={{ padding: 16 }} />; // unchanged
<Card style={{ float: 'left' }} />; // now a type error
```

Web components are unaffected and still accept custom properties.
