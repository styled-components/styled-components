---
"styled-components": patch
---

Fixed the shipped types failing to compile, with `skipLibCheck` turned off, against `@types/react` 16, 17, and 18.2.6 through 18.2.11. Those versions don't declare the `<search>` HTML element, and styled-components' types assumed they did.

`styled.search` keeps working on every version. Where the installed `@types/react` doesn't know the element, `styled.search`, `styled('search')` and `.attrs({ as: 'search' })` now accept the standard HTML attributes (the props `<search>` has on newer versions) and reject unknown props like every other tag, where they used to accept any prop at all.
