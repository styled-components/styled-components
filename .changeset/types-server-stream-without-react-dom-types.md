---
'styled-components': patch
---

Fixed an error inside styled-components' own type declarations, with `skipLibCheck` turned off, for projects without `@types/react-dom` installed. The `ServerStyleSheet` streaming API's types referenced a type that only `@types/react-dom` provides. `interleaveWithNodeStream` still accepts the result of `renderToPipeableStream` and Node readable streams exactly as before.
