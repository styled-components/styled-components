---
"styled-components": patch
---

On react-native-web, `onAnimationEnd` and `onTransitionEnd` on a styled React Native primitive run when that element's CSS animation or transition finishes. They run on primitives whose ref is the DOM element, including `View` and `Text`, and on `FlatList`, `SectionList`, and `VirtualizedList`. They do not run on `KeyboardAvoidingView`; put the callback on a styled `View` inside it.

The callback receives `{ animationName, elapsedTime }` or `{ propertyName, elapsedTime }`, the same as on iOS and Android. `elapsedTime` is in seconds and does not include `animation-delay` or `transition-delay`. `propertyName` is the camelCase style name, so a transition on `background-color` is reported as `backgroundColor`. A completion on a child does not call the parent's callback, and a completion on a pseudo-element does not call it either.
