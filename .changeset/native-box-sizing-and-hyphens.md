---
"styled-components": minor
---

Added `box-sizing` and `hyphens` support to React Native styles.

```tsx
import styled from 'styled-components/native';

const Card = styled.View`
  box-sizing: border-box;
  padding: 16px;
  border: 1px solid #ccc;
`;

const Paragraph = styled.Text`
  hyphens: auto;
`;
```

`box-sizing: border-box | content-box` now flows through unchanged on iOS, Android, and rn-web.

`hyphens: none | manual | auto` controls automatic word-breaking. On Android the value drives the system hyphenation frequency. On iOS automatic hyphenation can't be enabled programmatically, so `auto` falls back to manual breaking; embed soft-hyphens (U+00AD) in source text to control break points there. On rn-web the browser handles it natively.
