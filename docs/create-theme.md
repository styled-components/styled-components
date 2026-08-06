# createTheme

`createTheme(defaultTheme, options?)` returns an object whose every leaf is
`var(--prefix-path, fallback)`, so the same theme is usable from both client and RSC styled
components. The returned object *is* that tree of variable references, with the members below
assigned onto it, so `theme.colors.primary` reads as the `var(...)` string directly.

Passing the contract to `ThemeProvider` keeps class name hashes stable across themes, which is what
prevents a hydration mismatch when switching light and dark.

## Members

- `GlobalStyle` is a component that emits the variable declarations, and nothing renders the
  variables until it is mounted. Mount it inside the `ThemeProvider` whose theme supplies the values;
  changing that theme updates the declarations. Without it every leaf falls back to its default.
- `raw` holds the original theme object.
- `vars` holds the bare CSS custom property names (`--sc-path`), in the same shape as the theme. Use
  it in `createGlobalStyle` for dark mode overrides: `${vars.colors.bg}: #111;`.
- `resolve(el?)` reads the computed CSS variable values from the DOM, defaulting to
  `document.documentElement`, and returns a plain object of resolved values. It is client-only and
  throws rather than degrading when called outside a browser.

## Options

- `prefix` defaults to `"sc"`.
- `selector` defaults to `":root"`; use `":host"` for Shadow DOM.

## Dark mode

Combine `vars` with a `css` partial to write the overrides once and reuse them in both
`@media (prefers-color-scheme: dark)` and a `.dark` class. This avoids a hydration flash and avoids
hand-written variable names drifting from the theme.

## Implementation note

`reconstructWithOptions` must copy the `keyframeIds` Set to the new sheet.
