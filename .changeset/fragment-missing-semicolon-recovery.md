---
'styled-components': patch
---

A `css\`\`\``fragment placed after a declaration that was missing its trailing`;` is now treated as a sibling block instead of being silently swallowed into the prior value.

Before, this composition would render with broken styles because the `${...}` fragment was absorbed into the `margin` value:

```jsx
const Box = styled.View`
  margin: 0 ${10}px ${css`
      color: red;`};
`;
```

The fragment now reliably promotes to a sibling, so the declaration above behaves the same as if you had written `margin: 0 10px; color: red;`. Value-position fragments (`border: ${frag};`) are unaffected.
