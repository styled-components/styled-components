---
'styled-components': patch
---

A `css\`\`\``fragment placed after a declaration that is missing its trailing`;` is treated as a sibling block:

```jsx
const Box = styled.View`
  margin: 0 ${10}px ${css`
      color: red;`};
`;
```

The fragment promotes to a sibling, so the declaration above behaves the same as if you had written `margin: 0 10px; color: red;`. Value-position fragments (`border: ${frag};`) interpolate into the value as usual.
