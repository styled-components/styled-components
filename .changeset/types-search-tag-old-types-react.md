---
"styled-components": patch
---

Fixed the shipped types failing to compile, with `skipLibCheck` turned off, against `@types/react` 18.2.6 through 18.2.11: the `<search>` HTML element wasn't declared as a JSX intrinsic on those versions. `styled.search` is not available in the types there; use `styled('search')` instead, which type-checks and works the same way. Every other tag, and `@types/react` 18.2.12 onward, is unaffected.
