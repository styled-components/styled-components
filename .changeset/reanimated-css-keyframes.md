---
'styled-components': patch
---

React Native: when you opt into the Reanimated animation adapter, authored CSS animations and keyframes run on the UI thread. Reduced motion collapses CSS-layer durations and delays to zero, and `@starting-style` entry transitions start from the declared starting snapshot.
