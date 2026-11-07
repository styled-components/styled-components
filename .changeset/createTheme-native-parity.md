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

A theme value reads as if its text were written in the template at that spot, so anything the template supports works through a theme too: units such as `rem`, `em` and `vw`, keywords, shorthands such as `margin` and `border`, color functions, system colors, `env()`, and media query breakpoints. In `${theme.space.md}px`, a theme number takes the `px` that follows it.

- A theme value must be a single CSS value. One that holds a second declaration or a rule, such as `'red; position: absolute'`, is ignored in favor of the default, with a development warning.
- A value that isn't text, such as a `PlatformColor`, works as a whole color value (`color`, `border-color`, the color in a `border` shorthand) and passes through to the style as given. Anywhere else, such as inside `box-shadow`, `calc()` or `color-mix()`, it uses the theme default, with a development warning.
- Inside an `@keyframes` block in a component's styles, a theme value follows the active theme, including when the theme changes while the animation runs.
- `env(safe-area-inset-*)` and `anchor()` values work in a theme default. A `ThemeProvider` value that adds one where the default had none is not supported.

Nested `ThemeProvider`s on React Native deep-merge their theme objects so an inner override that only touches one leaf keeps the siblings it inherited; a child provider that sets `colors.text` keeps `colors.bg` from the ancestor. Behavior on the web is unchanged.
