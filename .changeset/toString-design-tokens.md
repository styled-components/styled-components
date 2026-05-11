---
'styled-components': patch
---

Fixed plain objects with a custom `toString()` being expanded as CSS-property blocks instead of stringified. Useful for design-token shapes where the token resolves to a default value but also carries alternate sub-values:

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
