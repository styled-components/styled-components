---
'styled-components': patch
---

A function interpolated into `keyframes`, directly or as a value in a style object, is left out of the animation, and in development a warning says so. Keyframes are built once where they are defined, so there are no props or theme to call a function with.

```tsx
const fade = keyframes`
  from { opacity: 1; }
  to { opacity: ${() => 0.2}; } /* left out, with a warning */
`;
```

For a theme value, interpolate the `createTheme` value. It follows the active theme, and one animation serves every theme:

```tsx
const theme = createTheme({ opacity: { dim: 0.2 } });

const fade = keyframes`
  from { opacity: 1; }
  to { opacity: ${theme.opacity.dim}; }
`;
```

For any other value, interpolate the value itself (`${0.2}`), or build the keyframes inside the function that has the value.
