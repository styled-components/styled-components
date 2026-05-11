---
"styled-components": minor
---

React Native: CSS `transition` now animates.

```jsx
const Card = styled.View`
  background-color: ${p => p.$bg};
  transition: background-color 280ms ease-out;
`;

// Tapping a button that flips $bg from 'red' to 'blue' now animates
// the background color smoothly instead of snapping.
```

Animation is on by default. No extra import or configuration. Eligible properties (opacity, every color, all border radius corners, transforms, shadows, filter) run on the native thread for jank-free 60 fps playback.

For full CSS animation support including `@keyframes` and `@starting-style`, opt into the reanimated adapter by importing it once at your app entry:

```js
import 'styled-components/native/reanimated';
```

This routes animations through reanimated's CSS animations layer. `react-native-reanimated@^4` is an optional peer dependency; install it yourself if you use this path.

Spec-correct CSS easing: `ease`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier()`, `steps()`, and `linear()` all map to their W3C-spec curves. The CSS `ease` keyword maps to the W3C `ease` curve, not React Native's `Easing.ease` (which is the `ease-in` curve and a common source of subtle visual mismatches in other libraries).

Honors `prefers-reduced-motion`: when the OS setting is on, durations collapse to 0 and animations snap.
