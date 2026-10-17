---
"styled-components": patch
---

On react-native-web, `onAnimationEnd` and `onTransitionEnd` on a styled React Native primitive (`View`, `Text`, and the other primitives) run when that element's CSS animation or transition finishes. The callback receives `{ animationName, elapsedTime }` or `{ propertyName, elapsedTime }`, the same fields as on iOS and Android. `elapsedTime` is in seconds. `propertyName` is the camelCase style name, so a transition on `background-color` is reported as `backgroundColor`. For a transition, `elapsedTime` is the transition duration and does not include `transition-delay`. A completion on a child does not call the parent's callback.
