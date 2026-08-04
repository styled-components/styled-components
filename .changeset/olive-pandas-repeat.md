---
'styled-components': patch
---

Fixed `ref` being rejected on React Native components created with the shorthand syntax, such as `styled.TextInput`. Passing a ref, or a ref callback whose parameter you have not annotated, now works the same way it does with `styled(TextInput)`.

Also fixed a type error when a component's `attrs` callback is given an explicit parameter type, as in `styled.div.attrs<MyProps>(props => props)`.
