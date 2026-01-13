---
"styled-components": patch
---

Fix createGlobalStyle compatibility with React StrictMode

This fix addresses issues where global styles would disappear or behave incorrectly in React StrictMode:

1. **Static styles optimization**: Static global styles (without props/interpolations) are now only injected once and won't be removed/re-added on every render. This prevents the style flickering that could occur during concurrent rendering.

2. **StrictMode-aware cleanup**: Style cleanup now uses `queueMicrotask` to coordinate with React's effect lifecycle. In StrictMode's simulated unmount/remount cycle, styles are preserved. On real unmount, styles are properly removed.

These changes ensure `createGlobalStyle` works correctly with:
- React StrictMode's double-render behavior
- React 18/19's concurrent rendering features
- React 19's style hoisting with the `precedence` attribute
