---
'styled-components': patch
---

React Native: pseudo-state selectors (`&:active`, `&:hover`, `&:focus`, `&:disabled`) behave correctly on non-pressable elements. React Native supports state-driven styles only on `Pressable`; on any other element (`View`, `Text`, ...) the base styles apply normally, the unreachable pseudo styles are skipped, and a development warning points to `styled.Pressable`. Rules fenced behind a media query that does not match (such as web-only `@media (hover: hover)` blocks) stay silent. `Pressable` and custom components keep the live state behavior.
