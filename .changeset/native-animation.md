---
'styled-components': minor
---

React Native: CSS `transition`, `@keyframes`, and `@starting-style` animate.

```jsx
const fade = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const Toast = styled.View`
  background-color: ${p => p.$bg};
  transition: background-color 280ms ease-out;
  animation: ${fade} 240ms ease-out both;
  @starting-style {
    opacity: 0;
  }
`;
```

Animation is on by default. No extra import, peer dependency, or configuration. Eligible properties (opacity, every color, all border radius corners, transforms, shadows, filter) run on the native thread for jank-free 60 fps playback. Keyframes drive multi-segment interpolations with per-frame easing, and the full grammar of `animation-direction`, `animation-fill-mode`, `animation-play-state`, and `animation-iteration-count` (integer, fractional, or `infinite`) is supported. Spec-correct color interpolation in oklab keeps mid-transition colors faithful.

Spec-correct CSS easing: `ease`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier()`, `steps()`, and `linear()` all map to their W3C-spec curves. The CSS `ease` keyword maps to the W3C `ease` curve, not React Native's `Easing.ease` (which is the `ease-in` curve and a common source of subtle visual mismatches in other libraries).

Comma-separated `animation-composition` pairs each value with the matching `animation-name` entry when you run multiple animations. On react-native-web, parallel animations that use additive composition (`add` or `accumulate`) pass `animation-composition` through to the browser so layered effects compose per CSS Animations Level 2; when every effect uses the default `replace` composition, the cascade is unchanged.

Multi-argument transform shorthands (`translate(x, y)`, `translate3d(x, y, z)`, and `scale(x, y)`) animate correctly per axis inside `@keyframes` or a `transition`, alongside single-axis forms and uniform `scale(n)`, on iOS, Android, and react-native-web.

Honors `prefers-reduced-motion`: when the OS setting is on, durations collapse to 0 and animations snap.

If your app already uses `react-native-reanimated@^4` on Fabric (New Architecture), you can route animations through its UI-thread-compiled CSS layer instead by importing the alternate adapter once at your app entry:

```js
import 'styled-components/native/reanimated';
```

Authored CSS animations and keyframes then run on the UI thread: reduced motion collapses CSS-layer durations and delays to zero, and `@starting-style` entry transitions start from the declared starting snapshot. This is purely opt-in; everything above works without it. `react-native-reanimated` is an optional peer dependency and is only required if you take this import.
