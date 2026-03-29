---
'styled-components': minor
---

Rearchitect `createGlobalStyle` to use shared stylesheet groups.

All instances of a `createGlobalStyle` component now share a single stylesheet group, registered once at definition time. This fixes unmounting one instance removing styles needed by others (#5695), styles scattering after remount (#3146), and group ID leaks during SSR (#3022).

CSS injection order is now fully determined at definition time (lower group ID = earlier in stylesheet). Render order no longer affects CSS order. Keyframes defined before a component correctly appear before that component's rules.

Also fixes: O(n^2) performance regression in jsdom test environments from unbounded rule accumulation, and stale static global styles during client-side HMR (effect deps now include the `globalStyle` reference so module re-evaluation triggers re-injection).
