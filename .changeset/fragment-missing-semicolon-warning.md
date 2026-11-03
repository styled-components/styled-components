---
'styled-components': patch
---

A development-only warning fires when a `css` fragment that carries its own declarations or rules is interpolated right after a declaration that is missing its trailing `;`:

```jsx
const Box = styled.div`
  margin: 0 ${10}px ${css`
      color: red;`};
`;
```

Without the `;`, the fragment text is read as part of the `margin` value, which is not valid CSS. The warning names the spot and asks for a `;` before the `${...}` interpolation. Value-position fragments (`border: ${frag};`) interpolate into the value as usual and do not warn.
