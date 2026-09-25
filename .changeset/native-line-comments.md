---
"styled-components": patch
---

Fixed `//` JavaScript-style line comments in React Native style declarations. Only `/* */` block comments were recognized before; a `//` comment left in a template literal was parsed as part of the surrounding CSS, which could drop or corrupt the styles that followed it on the same line. Line comments are now stripped the same way block comments already were, while a URL used as a raw value (for example `url(http://example.com/image.png)` or an unquoted `https://` value in a custom property) is left untouched.
