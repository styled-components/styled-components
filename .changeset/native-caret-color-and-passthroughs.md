---
'styled-components': minor
---

React Native: several CSS properties are supported across platforms: `caret-color`, `object-fit`, `backface-visibility`, and `outline-offset`.

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
```

`caret-color: auto | <color>` colors the text-insertion caret. On Android the color is applied to the caret only, leaving selection-range highlight untouched. On iOS the authored color applies to the caret; the platform exposes a single surface for the caret and selection highlight, so the selection picks up the same color as a side-effect and a development warning names the deviation. On react-native-web the browser handles it natively. Pass `selectionColor` directly on `<TextInput>` if an iOS-specific selection tint is needed.

`object-fit` on a styled Image renders consistently on iOS, Android, and react-native-web. `backface-visibility` and `outline-offset` flow through unchanged on all three targets.
