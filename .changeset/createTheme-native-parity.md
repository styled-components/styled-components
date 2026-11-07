---
'styled-components': major
---

React Native: `createTheme()` works the same way it does on the web. Pass the returned object to `ThemeProvider`, reference leaves in your styled components, and the current theme resolves automatically.

```tsx
import styled, { createTheme, ThemeProvider } from 'styled-components/native';

const theme = createTheme({
  colors: { bg: '#ffffff', text: '#111111' },
});

const Card = styled.View`
  background-color: ${theme.colors.bg};
  border-color: ${theme.colors.text};
`;

<ThemeProvider theme={{ colors: { bg: '#111', text: '#eee' } }}>
  <Card />
</ThemeProvider>;
```

A theme value that is a number or a `px` length, such as `0.2` for `opacity` or `'8px'` for `margin-top`, reaches React Native as the number it needs, the same as the value written in the template. Inside an `@keyframes` block in a component's styles, a theme value follows the active theme, including when the theme changes while the animation runs.

Nested `ThemeProvider`s on React Native deep-merge their theme objects so an inner override that only touches one leaf keeps the siblings it inherited; a child provider that sets `colors.text` keeps `colors.bg` from the ancestor. Behavior on the web is unchanged.
