---
"styled-components": patch
---

Fixed the shipped types failing to compile, with `skipLibCheck` turned off, against `@types/react` 16, 17, and 18.2.6 through 18.2.11. Those versions don't declare the `<search>` HTML element, and styled-components' types assumed they did. The published types now compile on every supported `@types/react`.

`styled.search` is present in the types on every version, and accepts the same props it did before, so no existing code stops compiling.
