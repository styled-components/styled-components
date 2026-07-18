---
'styled-components': minor
---

Polymorphic `as`-target attribute autocompletion now works in editors. Typing `<StyledComponent as="video" ` and then a partial attribute name surfaces that target's attributes (`loop`, `muted`, `controls`, `poster`, ...), including while the attribute name is still being typed. Plain usage keeps completing the component's own props, and `forwardedAs` targeting is unchanged. Runtime behavior is identical.
