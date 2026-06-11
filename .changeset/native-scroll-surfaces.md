---
'styled-components': minor
---

React Native: CSS `overscroll-behavior` and `scrollbar-width` are supported. Apply them to a `styled.ScrollView`, `styled.FlatList`, `styled.SectionList`, or `styled.VirtualizedList`:

- `overscroll-behavior: contain | none` disables both bounce on iOS and the over-scroll glow on Android. `overscroll-behavior: auto` (the initial value) restores the platform defaults.
- `scrollbar-width: none` hides both scroll indicators; `auto` and `thin` keep the platform default (React Native does not expose a thin-scrollbar surface). `thin` is equivalent to `auto` on native per the spec note that user agents may disregard `thin`.

Web builds continue to forward the declaration so the browser handles it natively.
