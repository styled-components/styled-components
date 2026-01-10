---
'styled-components': patch
---

fix: resolve TypeScript error blocking type declaration emission

Fixed TypeScript error in StyledComponent when merging style attributes from attrs. Added explicit type cast to React.CSSProperties to safely merge CSS property objects. This error was preventing TypeScript declaration files from being generated during build.
