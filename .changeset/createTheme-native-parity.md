---
"styled-components": major
---

React Native: `createTheme()` now works exactly the way it does on web. Pass the returned object to `ThemeProvider`, reference leaves in your styled components, and the current theme resolves automatically.

```tsx
import createTheme from 'styled-components/native';

const theme = createTheme({
  colors: { bg: '#ffffff', text: '#111111' },
});

const Card = styled.View`
  background-color: ${theme.colors.bg};
  border-color: ${theme.colors.text};
`;

<ThemeProvider theme={{ colors: { bg: '#111', text: '#eee' } }}>
  <Card />
</ThemeProvider>
```

Nested `ThemeProvider`s on React Native deep-merge their theme objects so an inner override that only touches one leaf doesn't wipe the siblings it inherited — a child provider that sets `colors.text` keeps `colors.bg` from the ancestor. Web behavior is unchanged: the CSS variable cascade continues to handle per-leaf inheritance.
