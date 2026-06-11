---
'styled-components': patch
---

A plain object with a custom `toString()` interpolated into a template stringifies via that method rather than expanding its keys as a CSS-property block. Useful for design-token shapes where the token resolves to a default value but also carries alternate sub-values:

```ts
const ink = {
  default: '#000',
  subtle: '#444',
  toString() {
    return this.default;
  },
};

const Heading = styled.h1`
  color: ${ink};
`;
```
