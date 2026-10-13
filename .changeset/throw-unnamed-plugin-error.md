---
"styled-components": patch
---

A stylis plugin without a name passed to `<StyleSheetManager stylisPlugins={[...]}>` now throws the documented "not named" error (#15) again. The error was being created but never thrown, so an anonymous function was accepted silently and shared its class names with the same component rendered without plugins.
