---
'styled-components': patch
---

Fix createGlobalStyle compatibility with React StrictMode and RSC

This fix addresses issues where global styles would disappear or behave incorrectly in React StrictMode and RSC:

1. **Static styles optimization**: Static global styles (without props/interpolations) are now only injected once and won't be removed/re-added on every render. This prevents the style flickering that could occur during concurrent rendering.

2. **StrictMode-aware cleanup**: Style cleanup now uses `queueMicrotask` to coordinate with React's effect lifecycle. In StrictMode's simulated unmount/remount cycle, styles are preserved. On real unmount, styles are properly removed.

3. **RSC compatibility**: Move `useRef` inside RSC guard in `createGlobalStyle` and unify all `useContext` calls to use consistent `!IS_RSC ?` pattern.

4. **RSC inline style tag cleanup**: Fix bug where server-defined `createGlobalStyle` rendered in client components would leave behind accumulated SSR-rendered inline `<style data-styled-global>` tags. The cleanup effect now removes these hoisted style tags when the component unmounts or re-renders with different CSS.

These changes ensure `createGlobalStyle` works correctly with:

- React StrictMode's double-render behavior
- React 18/19's concurrent rendering features
- React 19's style hoisting with the `precedence` attribute
- React Server Components (server-defined GlobalStyles in client components)
