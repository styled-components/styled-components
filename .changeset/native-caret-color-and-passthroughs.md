---
"styled-components": minor
---

Added cross-platform support for several CSS properties on React Native: `caret-color`, `object-fit`, `vertical-align`, `backface-visibility`, and `outline-offset`.

```tsx
import styled from 'styled-components/native';

const SearchField = styled.TextInput`
  caret-color: #00aacc;
  border: 1px solid #ccc;
`;

const Avatar = styled.Image`
  object-fit: cover;
  width: 64px;
  height: 64px;
`;

const Badge = styled.Text`
  vertical-align: middle;
`;
```

`caret-color: auto | <color>` colors the text-insertion caret. On Android the color is applied to the caret only, leaving selection-range highlight untouched. On rn-web the browser handles it natively. iOS keeps its default caret color in this release: React Native's iOS selection API tints the caret and selection range together, which would violate the spec's "caret only" contract. Pass `selectionColor` directly on `<TextInput>` if an iOS-specific tint is needed.

`object-fit`, `vertical-align`, `backface-visibility`, and `outline-offset` now flow through unchanged on iOS, Android, and rn-web.
