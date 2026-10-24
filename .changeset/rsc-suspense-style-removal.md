---
'styled-components': patch
---

Fixed styles from server components and `createGlobalStyle` disappearing when React reveals content from behind a `<Suspense>` boundary, or when a navigation swaps one sibling route for another. A component first rendered inside a loading fallback, or a global style mounted by both a layout and its page, could end up with a class name but no matching rule, or with no global styles at all.

Every server-rendered styled component and global style carries the rules it needs, so no instance depends on another surviving. The data React sends to the browser includes each distinct style once.
