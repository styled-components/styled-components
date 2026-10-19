---
'styled-components': patch
---

An `attrs` callback that takes the style AST (`(props, ast) => ...`) and pops a kebab-case declaration, such as `ast.pop('accent-color')`, now removes that declaration on web. When the callback read props, the inline override was written under the kebab-case key, which React ignores with an "Unsupported style property" warning, so the popped declaration still applied.
