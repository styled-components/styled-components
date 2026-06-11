---
'styled-components': major
---

React Native: CSS-to-style-object translation is built in. The native path supports a broad set of modern CSS:

- `transform: matrix(...)` / `matrix3d(...)`.
- `transform: translateX(10)` (bare number, no unit).
- `background-image: linear-gradient(...)` / `radial-gradient(...)`.
- `filter: blur(4px) saturate(1.5)` and the full filter-function chain.
- Modern color notations: `rgb(r g b / a)` slash-alpha, `hwb()`, `hsl()`.
- `box-shadow` with spread and inset.
- `mix-blend-mode`, `isolation`, `cursor`.

```tsx
import styled from 'styled-components/native';

const Tile = styled.View`
  background-image: linear-gradient(135deg, hsl(220 80% 60%), hsl(280 70% 50%));
  filter: blur(2px) saturate(1.5);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
  transform: matrix(1, 0, 0, 1, 8, 0);
`;
```

`border: none` emits `border-style: none` on native, matching the rest of the ecosystem.

`text-decoration: underline` without a color follows the text color, matching CSS's `currentcolor` initial value; an authored color still applies (on iOS and the web; Android always paints decorations in the text color and warns in development when a color is authored).

iOS setup note for filters: in React Native 0.85, the `filter` primitives `blur`, `saturate`, `hue-rotate`, `grayscale`, `contrast`, and `drop-shadow` only render when your iOS app opts into the SwiftUI-based filter backend. Set `ReactNativeReleaseLevel` to `experimental` in your iOS `Info.plist` (or `ios.infoPlist` in `app.json` for Expo) to enable it. `brightness` and `opacity` are supported without this flag.
