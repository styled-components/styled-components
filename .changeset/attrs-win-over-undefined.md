---
'styled-components': patch
---

Fixed `attrs` not applying its value when a prop was explicitly passed as `undefined`. `styled.button.attrs({ type: 'button' })` now renders `type="button"` for `<Button type={undefined} />`, including through a wrapper component that spreads its own props over the styled component. `attrs` always wins for the keys it returns, on web and React Native.

Also fixed: a prop passed explicitly as `undefined` (and not set by `attrs`) is now forwarded to a wrapped component so that component can fall back to its own default, the pattern MUI's `ButtonBase` relies on (for example `<Root role="button" {...props} />`). A DOM tag such as `styled.div` still drops the prop, since browsers have no "undefined" attribute. A component that checks `'role' in props` may see the key where it did not before.

To let a caller's `undefined` clear an `attrs` default, use the function form and check for the prop:

```js
styled.a.attrs(props => ('rel' in props ? {} : { rel: 'noopener' }))``;
```

`rel={undefined}` then renders no `rel`, and omitting the prop renders `rel="noopener"`.
