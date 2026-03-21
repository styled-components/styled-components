---
'styled-components': minor
---

Rearchitect `createGlobalStyle` to use shared stylesheet groups and eagerly register keyframes groups.

**Global styles:** All instances of a `createGlobalStyle` component now share a single stylesheet group, registered once at definition time. Previously, each mounted instance allocated its own group — causing unmounting one instance to remove styles needed by other still-mounted instances (#5695), scattering styles across the stylesheet after remount (#3146), and leaking group IDs during SSR (#3022).

**Ordering algorithm:** CSS injection order is now fully determined at definition time:
1. When `styled()`, `createGlobalStyle()`, or `keyframes()` is called, a group ID is allocated in a global counter
2. Lower group IDs always appear earlier in the stylesheet
3. Render order does not affect CSS order — only definition order matters
4. Global style instances share their definition's group, so remounting always returns to the original position
5. Keyframes defined before a component now correctly appear before that component's rules

**Breaking changes:**
- Keyframes CSS now appears _before_ (not after) components that reference them when the keyframes are defined first. This is semantically correct but changes the observable order.
- SSR rehydration markers changed from `id="sc-global-X1"` to `id="sc-global-X"`. Apps upgrading across versions with cached SSR output may see a one-time style duplication until caches refresh.
