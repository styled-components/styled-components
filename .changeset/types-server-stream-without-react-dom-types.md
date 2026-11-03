---
'styled-components': patch
---

Fixed errors inside styled-components' own type declarations, with `skipLibCheck` turned off, for projects without `@types/react-dom` or `@types/node` installed. The `ServerStyleSheet` streaming API's types referenced types that only those packages provide. `interleaveWithNodeStream` still accepts the result of `renderToPipeableStream` and Node readable streams exactly as before, and with `@types/node` installed it still returns a full Node stream type.
