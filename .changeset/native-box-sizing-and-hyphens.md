---
'styled-components': minor
---

React Native: `box-sizing` and `hyphens` are supported.

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

`box-sizing: border-box | content-box` flows through unchanged on iOS, Android, and react-native-web.

`hyphens: none | manual | auto` controls automatic word-breaking. On Android the value drives the system hyphenation frequency. On iOS automatic hyphenation can't be enabled programmatically, so `auto` falls back to manual breaking; embed soft-hyphens (U+00AD) in source text to control break points there. On react-native-web the browser handles it natively.
