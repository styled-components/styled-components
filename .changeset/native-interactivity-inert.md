---
'styled-components': patch
---

React Native: `interactivity: inert` is supported. The styled component and its subtree stop responding to touch, reject D-pad / keyboard focus, and are hidden from screen readers (VoiceOver on iOS, TalkBack on Android). Not supported: a focusable child rendered inside an inert subtree on Android can still receive focus, which a development warning flags.

react-native-web lets the browser honor the property natively via the HTML `inert` attribute.
