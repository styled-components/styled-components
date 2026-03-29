---
'styled-components': minor
---

Add `createTheme(defaultTheme, options?)` for CSS variable theming that works across RSC and client components.

Returns an object with the same shape where every leaf is `var(--prefix-path, fallback)`. Pass it to `ThemeProvider` for stable class name hashes across themes (no hydration mismatch on light/dark switch).

```ts
const theme = createTheme({ colors: { primary: '#0070f3' } });
// theme.colors.primary → "var(--sc-colors-primary, #0070f3)"
// theme.raw → original object
// theme.resolve(el?) → computed values from DOM (client-only)
// theme.GlobalStyle → component that emits CSS var declarations
```

Options: `prefix` (default `"sc"`), `selector` (default `":root"`, use `":host"` for Shadow DOM).
