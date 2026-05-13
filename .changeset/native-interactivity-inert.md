---
'styled-components': patch
---

`interactivity: inert` now applies on React Native: the styled component and its subtree stop responding to touch, no longer accept D-pad / keyboard focus, and are hidden from screen readers (VoiceOver on iOS, TalkBack on Android). One known gap surfaces via a one-time dev warning on Android: a focusable child rendered inside an inert subtree may still receive focus, because React Native does not propagate that flag down the tree.

`react-native-web` lets the browser honor the property natively via the HTML `inert` attribute.
