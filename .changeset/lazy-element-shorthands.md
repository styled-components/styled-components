---
'styled-components': minor
---

Smaller bundles: `styled.div` and every other element shorthand is built the first time it is read, so an app ships no table of element names and pays only for the tags it uses.

`styled.div`, `styled.feBlend` and the rest behave exactly as before, including returning the same component factory on repeated reads, and `'div' in styled` still answers `true`. Two things differ if you inspect `styled` itself: `Object.keys(styled)` no longer lists every tag, and reading a lowercase name that is not a standard element (`styled.blink`) now hands back a working factory rather than `undefined`, matching what `styled('blink')` has always done. CamelCase probes such as `toJSON` stay undefined.

Published bundles are also emitted as ES2020 rather than ES2015. Every supported peer (React 19, React Native 0.85, Node 16) runs that syntax natively.
