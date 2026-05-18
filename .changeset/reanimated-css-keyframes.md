---
'styled-components': patch
---

React Native: when you opt into the Reanimated animation adapter, authored CSS animations and keyframes now run on the UI thread as intended instead of being ignored. Reduced motion collapses CSS-layer durations and delays to zero, and `@starting-style` entry transitions coordinate a two-frame paint so transitions can start from the declared starting snapshot.
