---
"styled-components": patch
---

Fixed the shipped types failing to compile against `@types/react` 18.2.6 and nearby early 18.2.x patches: the `<search>` HTML element wasn't declared as a JSX intrinsic on those versions, so `styled.search`'s type broke every other styled component's types along with it. `styled.search` now falls back to an untyped shorthand on those older `@types/react` versions instead; use `styled('search')` there for full typing. Every other tag, and every newer `@types/react` version, is unaffected.
