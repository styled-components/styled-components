---
'styled-components': patch
---

Comments, unclosed parentheses, and unclosed strings stay contained in the statement that holds them.

A CSS comment is removed wherever it appears, including inside a function call (`calc(1px /* ) */ + 2px)`) and after an escaped parenthesis in a selector (`&.a\(b`). Inside a function call it leaves a space, so `rgb(0/**/51/**/255)` reads as three numbers. An unquoted `url(x/*.png)` keeps its path, because a comment cannot start inside one, and a quote inside an unquoted `url(` opens no string, matching how browsers read it.

A statement with a `(` or a quote that never closes is dropped, along with everything after it in the template, whether the opening character is in the template or in an interpolated value. A typo such as `width: calc(1px; color: red;` removes those styles from its own component and cannot consume the rules of other components in the stylesheet, and development builds log a warning naming the statement. A `(` closed by an interpolated value (`translate(${x}${y}`, where `y` ends in `)`) works as written.

`createGlobalStyle` keeps all of its rules when an interpolated value holds a `;` or closes a `(`.
