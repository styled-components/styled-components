---
"styled-components": major
---

React Native: the CSS-to-style-object translation layer is now built in. Several long-standing limitations go away on the native path.

- `transform: matrix(...)` / `matrix3d(...)` work.
- `transform: translateX(10)` (bare number, no unit) works.
- `background-image: linear-gradient(...)` / `radial-gradient(...)` work.
- `filter: blur(4px) saturate(1.5)` and the full filter-function chain work.
- Modern color notations pass through to React Native's color parser unchanged: `rgb(r g b / a)` slash-alpha, `hwb()`, `hsl()` all work.
- `box-shadow` with spread and inset pass through as CSS strings.
- `mix-blend-mode`, `isolation`, `cursor` flow through.

```tsx
import styled from 'styled-components/native';

const Tile = styled.View`
  background-image: linear-gradient(135deg, hsl(220 80% 60%), hsl(280 70% 50%));
  filter: blur(2px) saturate(1.5);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
  transform: matrix(1, 0, 0, 1, 8, 0);
`;
```

The transform layer also fixes `border: none` emitting `border-style: solid` on native; it now emits `border-style: none` to match the rest of the ecosystem.

iOS setup note for filters: in React Native 0.85, the `filter` primitives `blur`, `saturate`, `hue-rotate`, `grayscale`, `contrast`, and `drop-shadow` only render when your iOS app opts into the SwiftUI-based filter backend. Set `ReactNativeReleaseLevel` to `experimental` in your iOS `Info.plist` (or `ios.infoPlist` in `app.json` for Expo) to enable it. `brightness` and `opacity` work without this flag.
