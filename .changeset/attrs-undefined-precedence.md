---
"styled-components": patch
---

Fixed `attrs` no longer applying its value when a prop was explicitly passed as `undefined` (the 6.3.12 to 6.5.x behavior). `styled.button.attrs(({ type = 'button', ...rest }) => ({ type, ...rest }))` rendered without `type="button"` when the caller passed `type={undefined}`, and an object-form default such as `.attrs({ type: 'button' })` was lost the same way, including through a wrapper component that spreads its own props over the styled component. `attrs` now always wins for the keys it returns, matching every other case where a prop is passed alongside `attrs`.

Also fixed: a prop passed explicitly as `undefined` (and not overridden by `attrs`) is now forwarded to a wrapped component so that component can fall back to its own default, the pattern MUI's `ButtonBase` relies on (for example `<Root role="button" {...props} />`). Wrapped components have dropped this prop entirely since v6.0, so a component that checks `'role' in props` or merges `{...defaults, ...props}` to detect an explicitly-passed prop may see and behave differently now that the key is present again. This only applies when wrapping another component; a DOM tag such as `styled.div` still drops the `undefined` prop entirely, since browsers have no notion of an "undefined" attribute.

If you were relying on an explicit `undefined` to clear an `attrs` default, use the function form and check for the prop's presence instead:

```js
styled.a.attrs(props => ('rel' in props ? {} : { rel: 'noopener' }))``;
```

Passing `rel={undefined}` now renders no `rel` attribute, and omitting the prop renders `rel="noopener"`.

React Native already forwarded an explicit `undefined` prop to a wrapped component; it now also matches web in never forwarding an `undefined` that `attrs` itself produced.
