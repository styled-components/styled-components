# attrs Behavior

- `attrs` always wins over a directly passed prop, with no exception, including when the caller
  passes the prop as `undefined` (#5807). This is by design, not a precedence accident.
- An attrs value of `undefined` for a key removes that key when context held a defined value for it
  (the caller's own prop, or an earlier `attrs` call's value). When context already held an explicit
  `undefined` there (the caller passed it directly, including through an identity-spread attrs
  function that echoes it back, e.g. `attrs(({ type = 'button', ...rest }) => ({ type, ...rest }))`
  with a caller-passed `onClick={undefined}` flowing through `rest`), the key stays in place rather
  than being removed, so it still reaches a wrapped component the same as if `attrs` had never
  mentioned it.
- A prop the caller passes explicitly as `undefined`, for a key attrs does not mention, is forwarded
  as an own key (so `'key' in props` is `true`) to a wrapped COMPONENT target, letting that component
  fall back to its own default (#4338, the MUI `ButtonBase` pattern: `<Root role="button" {...props} />`).
  A DOM (string) tag target never receives it: React already drops an `undefined` attribute, so
  forwarding one would be new DOM behavior.
- The function form is the escape hatch when a caller's value should win over an attrs default:

  ```js
  .attrs(({ as }) => ({ as: as || 'button' }))
  ```

- To let a caller's explicit `undefined` clear an attrs default instead of attrs winning, check
  `'key' in props` in the function form and return nothing for that key when the caller passed it at
  all:

  ```js
  .attrs(p => ('rel' in p ? {} : { rel: 'noopener' }))
  ```

  `rel={undefined}` then renders no `rel`; omitting the prop renders `rel="noopener"`.
