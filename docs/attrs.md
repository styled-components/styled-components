# attrs Behavior

- `attrs` always wins over a directly passed prop, with no exception, including a prop the caller passes as `undefined` (#5807). This matches 6.6.0.
- An attrs value of `undefined` removes the key when context held a defined value for it (the caller's prop, or an earlier `attrs` value). When context already held an explicit `undefined` (passed directly, or echoed back by a spread function such as `attrs(p => ({ ...p }))`), the key stays, so it still reaches a wrapped component as if `attrs` had not mentioned it.
- A prop passed explicitly as `undefined`, for a key `attrs` does not set, is forwarded as an own key (`'key' in props` is `true`) to a wrapped component target, so that component falls back to its own default (#4338, the MUI `ButtonBase` shape `<Root role="button" {...props} />`). A DOM tag target never receives it; React drops an `undefined` attribute anyway.
- Escape hatch when the caller's value should win over an attrs default, the function form:

  ```js
  .attrs(({ as }) => ({ as: as || 'button' }))
  ```

- Escape hatch when a caller's explicit `undefined` should clear an attrs default, check `'key' in props` and return nothing for that key:

  ```js
  .attrs(p => ('rel' in p ? {} : { rel: 'noopener' }))
  ```

  `rel={undefined}` renders no `rel`; omitting the prop renders `rel="noopener"`.
