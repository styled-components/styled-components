# styled-components

## 7.0.0

### Major Changes

- React Native: `createTheme()` now works exactly the way it does on web. Pass the returned object to `ThemeProvider`, reference leaves in your styled components, and the current theme resolves automatically. ([createTheme-native-parity.md](https://github.com/styled-components/styled-components/commits/main/.changeset/createTheme-native-parity.md))

  ```tsx
  import styled, { createTheme, ThemeProvider } from 'styled-components/native';

  const theme = createTheme({
    colors: { bg: '#ffffff', text: '#111111' },
  });

  const Card = styled.View`
    background-color: ${theme.colors.bg};
    border-color: ${theme.colors.text};
  `;

  <ThemeProvider theme={{ colors: { bg: '#111', text: '#eee' } }}>
    <Card />
  </ThemeProvider>;
  ```

  Nested `ThemeProvider`s on React Native deep-merge their theme objects so an inner override that only touches one leaf keeps the siblings it inherited; a child provider that sets `colors.text` keeps `colors.bg` from the ancestor. Web behavior is unchanged.

- Styled components no longer honor `defaultProps`. React 19 removed `defaultProps` support from function components, so styled components can no longer inherit a parent's `defaultProps` either. ([drop-default-props.md](https://github.com/styled-components/styled-components/commits/main/.changeset/drop-default-props.md))

  Migration: use `.attrs()` for prop defaults. The object form always wins over user-provided props (this is intentional, see the attrs FAQ). The function form lets user-provided props override the default:

  ```tsx
  // Before (v6, no longer applies in v7)
  const Button = styled.button``;
  Button.defaultProps = { type: 'button' };

  // After (object form always wins)
  const Button = styled.button.attrs({ type: 'button' })``;

  // After (user-provided overrides allowed)
  const Button = styled.button.attrs<{ type?: string }>(p => ({
    type: p.type ?? 'button',
  }))``;
  ```

  For a default theme, wrap the tree in `<ThemeProvider theme={...}>` instead.

- Removed the `disableCSSOMInjection` prop on `<StyleSheetManager>` and the `SC_DISABLE_SPEEDY` / `REACT_APP_SC_DISABLE_SPEEDY` environment variables. Added a new `extractCSS` export. ([extract-css-and-drop-speedy-toggle.md](https://github.com/styled-components/styled-components/commits/main/.changeset/extract-css-and-drop-speedy-toggle.md))

  Browser builds now always use the same fast injection path that production has used by default for years. There's no longer a knob to switch into a slower text-based mode at runtime, and dev and production now behave identically.

  If you were using the toggle to make CSS visible as text (for static-render pipelines, micro-frontend cloning, embedding into iframes or Shadow DOM, or extraction tooling), call the new `extractCSS()` function after render to get the current CSS as a plain string:

  ```js
  import { extractCSS } from 'styled-components';

  // after rendering
  const css = extractCSS();
  ```

  The result is plain CSS without the rehydration markers used by `ServerStyleSheet`, so it can be injected directly into another document, stamped into a cloned DOM tree, or written to disk.

- Mounting the same `createGlobalStyle` component multiple times now emits its CSS only once. Previously each mount produced its own copy of the stylesheet rules. Rendering output stays byte-stable across SSR, client, and Server Components. ([global-style-useid.md](https://github.com/styled-components/styled-components/commits/main/.changeset/global-style-useid.md))
- React Native: CSS-to-style-object translation is now built in. Several long-standing limitations go away on the native path. ([native-transform-layer.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-transform-layer.md))
  - `transform: matrix(...)` / `matrix3d(...)` work.
  - `transform: translateX(10)` (bare number, no unit) works.
  - `background-image: linear-gradient(...)` / `radial-gradient(...)` work.
  - `filter: blur(4px) saturate(1.5)` and the full filter-function chain work.
  - Modern color notations pass through to React Native's color parser unchanged: `rgb(r g b / a)` slash-alpha, `hwb()`, `hsl()` all work.
  - `box-shadow` with spread and inset pass through as CSS strings.
  - `mix-blend-mode`, `isolation`, `cursor` flow through.

  ```tsx
  import styled from 'styled-components/native';

  const Tile = styled.View`
    background-image: linear-gradient(135deg, hsl(220 80% 60%), hsl(280 70% 50%));
    filter: blur(2px) saturate(1.5);
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
    transform: matrix(1, 0, 0, 1, 8, 0);
  `;
  ```

  `border: none` no longer emits `border-style: solid` on native; it now emits `border-style: none` to match the rest of the ecosystem.

  iOS setup note for filters: in React Native 0.85, the `filter` primitives `blur`, `saturate`, `hue-rotate`, `grayscale`, `contrast`, and `drop-shadow` only render when your iOS app opts into the SwiftUI-based filter backend. Set `ReactNativeReleaseLevel` to `experimental` in your iOS `Info.plist` (or `ios.infoPlist` in `app.json` for Expo) to enable it. `brightness` and `opacity` work without this flag.

- Raised peer dependency floors: ([peer-floors.md](https://github.com/styled-components/styled-components/commits/main/.changeset/peer-floors.md))
  - `react` and `react-dom` now require `>= 19.0.0` (was `>= 16.8`).
  - `react-native` now requires `>= 0.85.0` (was `>= 0.68`).
  - `css-to-react-native` is no longer a peer dependency. Apps that listed it solely for styled-components can drop it from their `package.json`.
  - The `enableVendorPrefixes` prop on `<StyleSheetManager>` and the runtime vendor prefixer have been removed. Modern browser targets handle prefixing natively; for the few properties that still need them (e.g. `-webkit-backdrop-filter` on Safari), declare both the prefixed and unprefixed forms in your CSS, or run a build-time PostCSS transform.

  Older React / React Native projects should stay on styled-components v6.

- Plugins moved to a dedicated `styled-components/plugins` subpath, and a first-party RTL plugin ships with the library. ([plugins-subpath.md](https://github.com/styled-components/styled-components/commits/main/.changeset/plugins-subpath.md))

  ```tsx
  import { StyleSheetManager } from 'styled-components';
  import { rtlPlugin, rscPlugin } from 'styled-components/plugins';

  <StyleSheetManager plugins={[rtlPlugin]}>
    <App />
  </StyleSheetManager>;
  ```

  `rtlPlugin` replaces `stylis-plugin-rtl` for users coming from v6: it swaps physical side properties (`padding-left` ↔ `padding-right`), flips `left`/`right` keyword values on `float` / `clear` / `text-align` / `caption-side`, and mirrors 4-value shorthand positions. Logical properties like `margin-inline-start` pass through unchanged.

  The `stylisPlugins` prop on `<StyleSheetManager>` is now `plugins`, and the top-level `stylisPluginRSC` export has moved into the new subpath as `rscPlugin`.

  Migration:

  ```diff
  -import { rtl, stylisPluginRSC } from 'styled-components';
  +import { rtlPlugin, rscPlugin } from 'styled-components/plugins';

  -<StyleSheetManager stylisPlugins={[rtl, stylisPluginRSC]}>
  +<StyleSheetManager plugins={[rtlPlugin, rscPlugin]}>
  ```

  Custom plugins authored against the v6 stylis contract need to port to the narrower plugin interface, which exposes `rw` (selector rewrite) and `decl` (declaration rewrite) hooks; implement either or both. Plugins are tree-shaken out of any app that doesn't import them.

  ```ts
  import type { SCPlugin } from 'styled-components';

  // `rw` runs on every fully-resolved selector after `&` substitution and
  // namespace prepending. Return a new selector string.
  const scopePlugin: SCPlugin = {
    name: 'scope',
    rw: selector => `.app ${selector}`,
  };

  // `decl` runs on every emitted `prop: value` pair (top-level decls, decl-body
  // at-rules, keyframe frames). Return `{ prop, value }` to rewrite, or `void`
  // to leave the pair unchanged.
  const remToPxPlugin: SCPlugin = {
    name: 'rem-to-px',
    decl: (prop, value) => {
      const match = value.match(/^(-?\d*\.?\d+)rem$/);
      return match ? { prop, value: `${parseFloat(match[1]) * 16}px` } : undefined;
    },
  };
  ```

  The `name` field is required and identifies the plugin so different plugin sets across nested `<StyleSheetManager>` trees stay isolated.

### Minor Changes

- Added a second argument to function-form `attrs((props, ast) => ...)` callbacks for bridging styles into props on third-party components. The `ast` accessor exposes `peek` (read a value) and `pop` (read and remove from the rendered style), and accepts either a CSS property name or a typed dot-separated theme path (e.g. `'color.red.500'`). Path autocomplete and value-type inference flow from your augmented theme. ([attrs-ast-bridge.md](https://github.com/styled-components/styled-components/commits/main/.changeset/attrs-ast-bridge.md))

  ```tsx
  import { Path } from 'react-native-svg';

  const Icon = styled(Path).attrs((_props, ast) => ({
    fill: ast.pop('color'), // lift CSS decl into a prop
    stroke: ast.peek('palette.brand'), // read from theme via typed path
  }))`
    color: red;
  `;
  ```

  Both methods take an optional fallback as the second argument, returned when the value is missing. Works on web and native, with no per-render overhead when the callback resolves entirely from static declarations.

- Modern CSS functions now work in React Native styles. Values that can be calculated immediately are converted before they reach React Native, while values that depend on the device, like viewport size, safe area, container size, or color scheme, update when those inputs change. ([modern-css-polyfills.md](https://github.com/styled-components/styled-components/commits/main/.changeset/modern-css-polyfills.md))

  ```tsx
  import styled from 'styled-components/native';

  const Card = styled.View`
    width: clamp(240px, 80vw, 480px);
    background-color: light-dark(white, #111);
    padding-top: env(safe-area-inset-top);
    border-radius: 8px;

    @container card (min-width: 320px) {
      padding: 24px;
    }
  `;
  ```

  - `clamp(10px, 50%, 400px)`, `min(100px, 50vw)`, `max(200px, 100vh)`, and `calc(100vw - 40px)`.
  - Math functions like `round()`, `mod()`, `rem()`, `sin()`, `cos()`, `tan()`, `pow()`, `sqrt()`, `hypot()`, `log()`, `exp()`, `abs()`, and `sign()` when their inputs are known before render.
  - `oklch(...)`, `oklab(...)`, `lch(...)`, `lab(...)` resolve to a color React Native can render. Wide-gamut inputs that fall outside sRGB are mapped to the closest in-gamut color while preserving hue, so the rendered result stays as close as possible to what was written.
  - `color-mix(in <space>, …)` mixes through the requested space (`srgb`, `oklab`, `oklch`, `lab`, `lch`) and converts back to sRGB for display.
  - Viewport units `vw` / `vh` / `vmin` / `vmax` / `dvh` / `svh` / `lvh` scale to the current window dimensions.
  - Container query units `cqw` / `cqh` / `cqmin` / `cqmax` scale to the nearest ancestor container.
  - `light-dark(light, dark)` swaps based on OS appearance.
  - `env(safe-area-inset-top | right | bottom | left)` reads from the device safe area.
  - Logical shorthands `margin-inline`, `margin-block`, `padding-inline`, `padding-block`, `inset-inline`, `inset-block` work as authored.
  - `line-clamp: N` truncates to N lines.
  - `&:is(:hover, :focus)` and `&:where(:pressed, :disabled)` apply the styles to each listed state.
  - `@media (min-aspect-ratio: 16/9)`, `(max-aspect-ratio: 1/1)`, and exact `(aspect-ratio: 4/3)` match the device's current width-to-height ratio. Bare numbers are treated like `<n>/1`, matching browser behavior.
  - `@starting-style { ... }` declarations apply on first mount: the starting values are the initial state and any transitions on the same component animate from there toward the resolved values.

  Features React Native does not yet support (`position: fixed`, `position: sticky`, `backdrop-filter`, 3D transforms, `text-shadow`, scroll-snap, view-transitions, form-state selectors, and more) are listed in the "React Native CSS Features" compatibility tracker maintained alongside the library.

- CSS `accent-color` now works on every target. Applied to a `styled.Switch`, it tints the on-state surface so the control picks up the value (the closest analog to the on-web behavior of tinting a checked checkbox). Both `<color>` values and `accent-color: auto` are accepted; `auto` resolves to the platform's accent color. ([native-accent-color.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-accent-color.md))

  The same color forms work here as in every other color slot in styled-components: HTML named colors, CSS Color 4 system keywords, hex, modern color functions, and theme tokens.

  For wrapping a third-party component (Slider, Checkbox, ProgressBar, etc.) whose tint prop isn't `<Switch>.trackColor`, use the function form of `.attrs(...)` with the AST bridge to forward the resolved value:

  ```tsx
  const ThemedSlider = styled(Slider).attrs<{ thumbTintColor?: string }>((_props, ast) => ({
    thumbTintColor: ast.pop('accentColor'),
  }))`
    accent-color: red;
  `;
  ```

  `ast.pop('accentColor')` returns the resolved value and removes it from the style bag so it doesn't reach the wrapped component as an unrecognized style key. Cascade-style inheritance from an ancestor `accent-color` declaration down to a descendant `<Switch>` is not implemented in this release; declare `accent-color` on the Switch itself (or use the attrs recipe above when wrapping).

- React Native: CSS `transition`, `@keyframes`, and `@starting-style` now animate. ([native-animation-adapter.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-animation-adapter.md))

  ```jsx
  const fade = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
  `;

  const Toast = styled.View`
    background-color: ${p => p.$bg};
    transition: background-color 280ms ease-out;
    animation: ${fade} 240ms ease-out both;
    @starting-style {
      opacity: 0;
    }
  `;
  ```

  Animation is on by default. No extra import, peer dependency, or configuration. Eligible properties (opacity, every color, all border radius corners, transforms, shadows, filter) run on the native thread for jank-free 60 fps playback. Keyframes drive multi-segment interpolations with per-frame easing, and the full grammar of `animation-direction`, `animation-fill-mode`, `animation-play-state`, and `animation-iteration-count` (integer, fractional, or `infinite`) is supported. Spec-correct color interpolation in oklab keeps mid-transition colors faithful.

  Spec-correct CSS easing: `ease`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier()`, `steps()`, and `linear()` all map to their W3C-spec curves. The CSS `ease` keyword maps to the W3C `ease` curve, not React Native's `Easing.ease` (which is the `ease-in` curve and a common source of subtle visual mismatches in other libraries).

  Honors `prefers-reduced-motion`: when the OS setting is on, durations collapse to 0 and animations snap.

  If your app already uses `react-native-reanimated@^4` on Fabric (New Architecture), you can route animations through its UI-thread-compiled CSS layer instead by importing the alternate adapter once at your app entry:

  ```js
  import 'styled-components/native/reanimated';
  ```

  This is purely opt-in; everything above works without it. `react-native-reanimated` is an optional peer dependency and is only required if you take this import.

- React Native: `:not(...)` now works for simple selectors. Rules such as `:not(:hover)`, `:not(:focus)`, `:not([disabled])`, and `:not([data-state='loading'])` apply when the condition inside `:not()` is not true. More complex forms, including multiple selectors or nested descendant selectors, still show a development warning and are ignored on native. ([native-attr-operators-and-not.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-attr-operators-and-not.md))
- React Native: attribute selectors now apply styles based on the rendered element's props. ([native-attribute-selectors.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-attribute-selectors.md))

  ```jsx
  const Toggle = styled.Pressable`
    background: white;
    &[aria-pressed='true'] {
      background: yellow;
    }
  `;

  <Toggle aria-pressed={true} />; // yellow background
  ```

  The same CSS works on web and native. This is especially useful for `aria-*` props, since React Native passes them to platform accessibility services. Presence checks like `&[attr]` match when the prop is defined, and exact matches like `&[attr='value']` compare the rendered prop value as text, so `aria-pressed={true}` and `aria-pressed="true"` both match `[aria-pressed='true']`. Substring, prefix, suffix, word, and case-insensitive matches are supported too.

- Added `box-sizing` and `hyphens` support to React Native styles. ([native-box-sizing-and-hyphens.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-box-sizing-and-hyphens.md))

  ```tsx
  import styled from 'styled-components/native';

  const Card = styled.View`
    box-sizing: border-box;
    padding: 16px;
    border: 1px solid #ccc;
  `;

  const Paragraph = styled.Text`
    hyphens: auto;
  `;
  ```

  `box-sizing: border-box | content-box` now flows through unchanged on iOS, Android, and rn-web.

  `hyphens: none | manual | auto` controls automatic word-breaking. On Android the value drives the system hyphenation frequency. On iOS automatic hyphenation can't be enabled programmatically, so `auto` falls back to manual breaking; embed soft-hyphens (U+00AD) in source text to control break points there. On rn-web the browser handles it natively.

- Added cross-platform support for several CSS properties on React Native: `caret-color`, `object-fit`, `vertical-align`, `backface-visibility`, and `outline-offset`. ([native-caret-color-and-passthroughs.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-caret-color-and-passthroughs.md))

  ```tsx
  import styled from 'styled-components/native';

  const SearchField = styled.TextInput`
    caret-color: #00aacc;
    border: 1px solid #ccc;
  `;

  const Avatar = styled.Image`
    object-fit: cover;
    width: 64px;
    height: 64px;
  `;

  const Badge = styled.Text`
    vertical-align: middle;
  `;
  ```

  `caret-color: auto | <color>` colors the text-insertion caret. On Android the color is applied to the caret only, leaving selection-range highlight untouched. On rn-web the browser handles it natively. iOS keeps its default caret color in this release: React Native's iOS selection API tints the caret and selection range together, which would violate the spec's "caret only" contract. Pass `selectionColor` directly on `<TextInput>` if an iOS-specific tint is needed.

  `object-fit`, `vertical-align`, `backface-visibility`, and `outline-offset` now flow through unchanged on iOS, Android, and rn-web.

- `em`, `lh`, and `rlh` length units now work on React Native. Values like `padding: 1em`, `gap: 0.5lh`, and `min(10px, 5em)` resolve against the current text size and line height, so typography-based spacing can be shared across web and native without rewriting everything to pixels. ([native-cascade-em-lh-direction-aware-text-align.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-cascade-em-lh-direction-aware-text-align.md))

  `text-align: start`, `text-align: end`, and `text-align: match-parent` now resolve correctly under both left-to-right and right-to-left writing directions on React Native. Authors get the same direction-aware behavior they get on the web; the previous fall-back-to-`auto` warning is removed.

  Components whose CSS declares `font-size`, `line-height`, or `direction` pass the resolved value to descendants, so one text size at the top of a card can drive the relative spacing inside it.

- React Native: descendant and child combinator selectors now work across styled components. ([native-combinator-selectors.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-combinator-selectors.md))

  ```jsx
  const Card = styled.View`
    padding: 16px;
  `;
  const Title = styled.Text`
    font-size: 14px;
    ${Card} & {
      font-size: 18px;
    }
  `;

  <Card>
    <Title>Bigger inside a Card</Title>
  </Card>
  <Title>Default size when standalone</Title>
  ```

  The descendant form `${Card} &` matches whenever the component is rendered anywhere inside `Card`. The child form `${Card} > &` only matches when `Card` is the nearest styled parent. Regular React Native components can sit between styled components without breaking selector matching.

  The same selectors also work on web. This also fixes a web bug where `${Component} { ... }` rules placed after another declaration could lose the component selector and target too broadly.

- React Native now supports CSS custom properties through the component cascade. ([native-css-var-warn.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-css-var-warn.md))

  Declare a property on any styled component (`--brand: tomato;`) and descendants can read it back through the standard `var()` syntax (`color: var(--brand);`). The substitution honors the full CSS Variables Module Level 1 contract — fallbacks (`var(--maybe, default)`), nested resolution (`var(--a, var(--b, default))`), nested resolution in the name argument (`var(var(--name-of-name))`), cycle detection, and case-sensitive names. Substituted values flow through the same value pipeline as authored CSS, so shorthand expansion (`margin: var(--spacing);` with `--spacing: 4px 8px;`) still expands to the individual longhands.

  Spec compliance touches:
  - `--foo: initial` correctly resets a custom property to the guaranteed-invalid value, so a downstream `var(--foo, fallback)` substitutes the fallback.
  - Trailing `!important` is stripped from custom property values before they reach the cascade.
  - A literal `var(--name)` inside a quoted CSS string (e.g. `content: "var(--brand)"`) is preserved verbatim instead of being mistakenly substituted.
  - Bare `--` declarations are dropped (reserved for future use per the spec) and never leak as a style key.

  The rn-web bundle leaves both the declarations and `var()` references in place so the browser's own cascade handles them. Development builds warn on a `var()` reference only when no ancestor declared the property and no fallback was provided.

- React Native: `field-sizing: content` makes a `TextInput` autosize to its content. ([native-field-sizing-content.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-field-sizing-content.md))

  ```jsx
  const Note = styled.TextInput`
    field-sizing: content;
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid #ddd;
  `;

  <Note placeholder="Start typing…" />;
  ```

  The field grows in height as the user types, no controlled height state, no `onContentSizeChange` wiring. Pass `multiline={false}` explicitly to keep a fixed single-line field (a dev-time message points out that autosize is off in that case).

  On `react-native-web` the declaration is handed straight to the browser, which has supported `field-sizing` natively since Chrome 123.

- CSS font-size keywords now produce identical pixel sizes on iOS, Android, and the web build. Absolute-size keywords (`xx-small`, `x-small`, `small`, `medium`, `large`, `x-large`, `xx-large`, `xxx-large`) resolve to 9, 10, 13, 16, 18, 24, 32, 48 (the reference table modern browsers use at the default medium of 16px). Relative-size keywords (`smaller`, `larger`) resolve at render time against the inherited cascade font-size, stepping to the next entry on the absolute-size ramp when the inherited size matches a keyword and otherwise multiplying by 1.2. ([native-font-keyword-parity.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-font-keyword-parity.md))

  Other CSS Fonts shorthand keyword classes that React Native cannot replicate exactly drop with a development warning that names the offending keyword and suggests a concrete alternative:
  - Font-width / font-stretch keywords (`condensed`, `expanded`, etc.) drop because React Native does not control glyph width.
  - System font names (`caption`, `icon`, `menu`, `message-box`, `small-caption`, `status-bar`) drop because the per-platform meaning has no cross-platform mapping; pick a `font-family` explicitly.

- Expanded the React Native CSS surface with four polyfills that previously dropped silently or warned: ([native-font-line-height-caret-line-width.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-font-line-height-caret-line-width.md))
  - `font-size` now accepts the full CSS length grammar: absolute-size keywords (`xx-small` through `xxx-large`), relative-size keywords (`larger` / `smaller`), absolute lengths (`pt`, `pc`, `in`, `cm`, `mm`, `Q`), font-relative units (`em`, `rem`, `lh`, `rlh` plus the font-metric forms `ex`, `cap`, `ch`, `ic` and their `r`-variants), viewport units (`vh`, `vw`, `dvh`, `svh`, `lvh` and width counterparts), container-query units (`cqh`, `cqw`, `cqi`, `cqb`, `cqmin`, `cqmax`), and percentages. Keyword sizes resolve to a fixed pixel ramp on every platform; everything else folds against the current environment at render time.
  - `line-height` now accepts the same expanded set: absolute lengths, font-relative units (including font-metric forms), viewport units, container-query units, and percentages all resolve against the cascade instead of being dropped with a development warning.
  - `caret-color` on iOS now applies the authored color to the text input's caret. iOS exposes a single surface for the caret and selection highlight, so the selection picks up the same color as a side-effect (a one-time development note names the deviation). Android and rn-web behavior is unchanged.
  - `round(line-width, A)` now snaps `A` to the device pixel grid at render time using the platform's pixel ratio, matching the CSS Values 4 "snap a length as a line width" algorithm. Useful for hairline borders that should align to physical pixels regardless of screen scale.

  `translate: x y z` no longer drops the Z value on React Native; the three-argument `translate(x, y, z)` form passes through unchanged on iOS and Android.

  The `transform-style: preserve-3d` development warning is more accurate: animated 3D transforms are already isolated automatically by the animation adapter, and the warn no longer suggests a manual `collapsable={false}` workaround for static decls (it has no effect on iOS without a perspective surface).

- React Native: `:has(<simple>)` selector now works. ([native-has-selector.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-has-selector.md))

  ```jsx
  const Card = styled.View`
    padding: 16px;
    &:has(${Icon}) {
      padding-left: 48px;
    }
    &:has([data-state='active']) {
      background-color: tomato;
    }
  `;

  <Card>
    <Icon />
  </Card>;
  ```

  The rule checks the component's children at render time and applies when any descendant matches. Two forms are supported on native:
  - `${Component}`: matches when the referenced styled component appears anywhere inside.
  - `[attr]` and `[attr=value]`: match when any descendant has the named prop. Value checks compare the rendered prop value as text, so `aria-pressed={true}` and `aria-pressed="true"` both match `[aria-pressed='true']`.

  More complex selectors inside `:has()`, such as descendant chains, sibling selectors, and nested `:has()` calls, are not supported on native yet.

- React Native now respects CSS `!important`. ([native-important-support.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-important-support.md))

  Authoring `color: red !important;` inside a styled component on native now behaves like the web:
  - The `!important` marker is stripped from the rendered value (previously the literal string `'red !important'` leaked onto the host element and the color silently failed).
  - Important declarations beat any normal declaration on the same property, regardless of source order, including overrides from matched `@media`, `@container`, `@supports`, attribute selectors, pseudo states (`:hover`, `:focus`, `:active`, `:disabled`), `:has()`, `:nth-child()`, and combinator selectors.
  - A shorthand marked `!important` propagates to every longhand (`padding: 4px 8px !important` becomes important across `padding-top` / `-right` / `-bottom` / `-left`).
  - Importance flows through `var()` substitution and through render-time resolvers (`light-dark()`, `env()`, viewport units, theme tokens).
  - Spec-aligned with the web: a styled component's `!important` beats a runtime `style={{ ... }}` prop. Normal declarations are still overridden by the runtime `style` prop as before.
  - Case-insensitive on the marker (`!IMPORTANT`) and tolerant of whitespace between `!` and `important`.

  `!important` inside `@keyframes` is ignored, matching the CSS Animations spec.

  Cross-component cascade of `!important` for inherited properties (a parent's `!important font-size` defeating a child's normal one) is not yet supported. Today's coverage is within-component only.

- `:nth-child(an+b of S)` and `:nth-last-child(an+b of S)` now work on React Native. The formula counts position within the filter, so `:nth-child(2n+1 of [data-active])` selects every odd active sibling regardless of inactive siblings between them. The `of S` inner accepts a styled-component reference or a single attribute selector (the same simple-selector forms `:has()` accepts on native). Complex inner selectors with combinators or descendant chains warn and fall through. ([native-nth-child-of-selector.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-nth-child-of-selector.md))

  ```tsx
  const Row = styled.View`
    background: white;
    &:nth-child(2n + 1 of [data-active]) {
      background: silver;
    }
  `;
  ```

- Relative color syntax now works in React Native styles. You can write values like `oklch(from #f00 calc(l - 0.15) c h)` to derive a new color from a base color, and styled-components converts the result to a color React Native can render consistently on iOS, Android, and the web. This works with `oklch`, `oklab`, `lch`, and `lab`. ([native-relative-color-fold.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-relative-color-fold.md))

  The base color can be a literal color, another modern color function, or a theme value such as `oklch(from ${theme.colors.brand} calc(l - 0.15) c h)`. That makes it possible to build lighter, darker, or more transparent variants from one source color without maintaining a separate shade table.

- CSS `overscroll-behavior` and `scrollbar-width` now work on React Native. Apply them to a `styled.ScrollView`, `styled.FlatList`, `styled.SectionList`, or `styled.VirtualizedList`: ([native-scroll-surfaces.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-scroll-surfaces.md))
  - `overscroll-behavior: contain | none` disables both bounce on iOS and the over-scroll glow on Android. `overscroll-behavior: auto` (the initial value) restores the platform defaults.
  - `scrollbar-width: none` hides both scroll indicators; `auto` and `thin` keep the platform default (React Native does not expose a thin-scrollbar surface). `thin` is equivalent to `auto` on native per the spec note that user agents may disregard `thin`.

  Web builds continue to forward the declaration so the browser handles it natively.

- `styled.ScrollView` now defaults to `flex-shrink: 0`, matching the behavior of `styled.View`. Previously, an explicit `width:` or `height:` declaration on a `ScrollView` could be silently overridden by the layout engine when the component sat in a flex parent, so the rendered dimension came out smaller (or larger) than declared. The fix makes explicit dimensions pin reliably; you can still opt back into the old behavior by declaring `flex-shrink: 1` in your own template. ([native-scrollview-flex-shrink.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-scrollview-flex-shrink.md))
- React Native: sibling combinator selectors and the `:nth-child` family now work. ([native-sibling-and-nth-child.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-sibling-and-nth-child.md))

  ```jsx
  const Card = styled.View`
    padding: 16px;
  `;
  const Divider = styled.View`
    height: 1px;
    ${Card} + & {
      margin-top: 8px;
    }
  `;

  const ListItem = styled.View`
    padding: 8px;
    &:nth-child(odd) {
      background-color: gainsboro;
    }
    &:first-child {
      border-top-width: 0;
    }
  `;
  ```

  Supported selector forms include:
  - Adjacent sibling: `${Component} + &`, which applies when the previous styled sibling is the referenced component.
  - General sibling: `${Component} ~ &`, which applies when any earlier styled sibling is the referenced component.
  - `:first-child`, `:last-child`, `:only-child`.
  - `:nth-child(N)`, `:nth-child(an+b)`, `:nth-child(odd)`, `:nth-child(even)`.
  - `:nth-last-child(...)` (same syntax as `:nth-child`, counting from the end).
  - `:first-of-type`, `:last-of-type`, `:only-of-type`, `:nth-of-type(...)`, and `:nth-last-of-type(...)`, which count siblings of the same element type.

  These selectors follow the component's JSX position among its siblings. Regular React Native components can sit between styled components without breaking selector matching.

- System color keywords such as `Canvas`, `CanvasText`, `Field`, `FieldText`, `GrayText`, `Highlight`, and `LinkText` now work on React Native when used alone or inside composite declarations such as `border`, `outline`, `background`, `text-decoration`, `text-shadow`, `box-shadow`, `filter` / `drop-shadow()`, multi-value `border-color`, and two-token `caret-color` values. Values like `color: CanvasText` and `background-color: Canvas` adapt to the user's appearance and platform color settings where React Native exposes them, with readable fallbacks for unsupported native semantics. The browser still handles these keywords directly on the web build. ([native-system-colors.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-system-colors.md))

  Keywords match regardless of casing.

- CSS `text-overflow: ellipsis | clip` now works on every target. Pair it with `line-clamp` or `text-wrap: nowrap` so the content can actually overflow. ([native-text-overflow-and-direction-mirror.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-text-overflow-and-direction-mirror.md))

  `direction: ltr | rtl | inherit` now follows the cascade through bidi-aware text on every target without having to set a second prop.

  `outline: 2px hidden red` and other `outline` declarations that include the `hidden` keyword now drop with a development warning, since `hidden` is not a legal outline style per the CSS UI spec. Use `outline: none` to remove an outline.

- `styled-components/native` now ships a much smaller, browser-native build for `react-native-web` consumers. Webpack, Vite, and Metro (when targeting web) pick it up automatically; existing imports and props are unchanged. ([native-web-bundle.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-web-bundle.md))

  On the web, styles route through the same pipeline the main `styled-components` browser entry uses. The browser handles CSS directly, so features that previously polyfilled at render time defer to native support:
  - `var()`, `@media`, `@container`, and pseudo-classes (`:hover`, `:focus`, `:nth-child(...)`, `:has(...)`) work natively without React re-renders.
  - `light-dark()` and `prefers-color-scheme` repaint without a React re-render. The document opts into `color-scheme: light dark` automatically so `useColorScheme()` reflects the OS preference.
  - `dvh` / `svh` / `lvh` and the inline / block-axis viewport units (`vi`, `vb`) resolve distinctly per CSS Values 4 instead of collapsing to a single value.
  - `oklch`, `oklab`, `lch`, `lab`, and `color-mix()` render in the browser's full wide gamut (Display P3 / Rec. 2020 where the monitor supports it) instead of rounding through sRGB.
  - Static-mixed-unit `calc()` / `clamp()` / `min()` / `max()` resolve against the real containing block at paint time.
  - `ThemeProvider` and `createTheme` tokens publish as scoped CSS custom properties, so theme changes restyle without re-rendering the subtree.

  The bundle is substantially smaller than the prior rn-web variant because the CSS polyfills that exist for iOS / Android are excluded. iOS and Android consumers are unaffected and continue to use the native CSS engine.

  Consumers who want the same bundle without relying on bundler resolution can import it directly: `styled-components/native/web-bridge`.

- Performance improvements across the board in v7. Component creation, SSR `renderToString`, and React Server Components rendering are all faster than v6, with SSR seeing the largest gains at scale. Template-literal work is done up front when the styled component is defined, so each render pays less. ([v7-perf-numbers.md](https://github.com/styled-components/styled-components/commits/main/.changeset/v7-perf-numbers.md))

### Patch Changes

- The arity-2 `.attrs((props, ast) => ...)` callback now sees `ast` as a non-optional `CompiledAst`, so authors no longer need to optional-chain to satisfy the TypeScript compiler under `strict: true`. The arity-1 form (`.attrs((props) => ...)`) is unchanged. ([attrs-ast-required-in-arity-2.md](https://github.com/styled-components/styled-components/commits/main/.changeset/attrs-ast-required-in-arity-2.md))
- Fixed a TypeScript regression where `styled(SomeComponent).attrs({...})` could trigger `TS2590: Expression produces a union type that is too complex to represent` on components with deeply-discriminated prop unions, notably antd's `Button`. Affected projects also see modestly faster type-checks; projects without complex unions see no measurable difference. ([attrs-type-perf.md](https://github.com/styled-components/styled-components/commits/main/.changeset/attrs-type-perf.md))
- React Native: `lab()` and `lch()` now produce correct colors when channels are written as percentages. `lab(50% 0 0)` resolves to mid-gray as expected, where it previously produced near-black. Per CSS Color L4, each space has its own range: ([color-percent-channels.md](https://github.com/styled-components/styled-components/commits/main/.changeset/color-percent-channels.md))
  - `lab` L: 0%-100% maps to 0-100. a/b: 100% maps to ±125.
  - `lch` L: 0%-100% maps to 0-100. C: 100% maps to 0-150.
  - `oklab` L: 0%-100% maps to 0-1. a/b: 100% maps to ±0.4.
  - `oklch` L: 0%-100% maps to 0-1. C: 100% maps to 0-0.4.

  Web is unaffected (browsers parse these notations natively).

- Empty CSS custom property values are now preserved. ([empty-custom-property-values.md](https://github.com/styled-components/styled-components/commits/main/.changeset/empty-custom-property-values.md))

  `--my-prop: ;` is a legitimate CSS declaration; the empty value is part of the Custom Properties spec and is used by patterns like scroll-driven animations as a "guaranteed-invalid" sentinel. Previously these declarations were silently dropped from the rendered output, which broke setups like:

  ```css
  @keyframes shadow-toggle {
    from,
    to {
      --shadow: ;
    }
  }
  ```

  They now render as authored. Empty values for non-custom properties (e.g. `color: ;`) continue to be dropped, since those are still invalid CSS.

  Note: components that author `--prop: ;` will get a new class name on upgrade since the emitted CSS now differs. Typical apps are unaffected.

- A `css\`\`\``fragment placed after a declaration that was missing its trailing`;` is now treated as a sibling block instead of being silently swallowed into the prior value. ([fragment-missing-semicolon-recovery.md](https://github.com/styled-components/styled-components/commits/main/.changeset/fragment-missing-semicolon-recovery.md))

  Before, this composition would render with broken styles because the `${...}` fragment was absorbed into the `margin` value:

  ```jsx
  const Box = styled.View`
    margin: 0 ${10}px ${css`
        color: red;`};
  `;
  ```

  The fragment now reliably promotes to a sibling, so the declaration above behaves the same as if you had written `margin: 0 10px; color: red;`. Value-position fragments (`border: ${frag};`) are unaffected.

- Fix native Node.js ESM default imports so `import styled from 'styled-components'` exposes the styled factory directly. ([fresh-node-default-import.md](https://github.com/styled-components/styled-components/commits/main/.changeset/fresh-node-default-import.md))
- styled-components no longer pulls `@emotion/is-prop-valid` from npm; the same prop-filtering logic that decides which props reach the underlying DOM element now ships inside the library. Consumers see a smaller dependency tree and a slightly smaller installed footprint, with identical behavior. ([inline-prop-validator.md](https://github.com/styled-components/styled-components/commits/main/.changeset/inline-prop-validator.md))

  If you were importing `isPropValid` from `@emotion/is-prop-valid` directly elsewhere in your app, that continues to work; this change only affects what styled-components itself depends on.

- Fixed selector resolution for nested rules whose parent contains a comma inside `:is()`, `:where()`, `:has()`, or an attribute selector. ([is-where-cross-product-bug.md](https://github.com/styled-components/styled-components/commits/main/.changeset/is-where-cross-product-bug.md))

  Previously a parent like `:is(&:hover, .parent:hover &) .child` containing a nested rule would produce nonsense output where the nested selector got injected into the first arm of the `:is(...)` call. For example:

  ```jsx
  const Card = styled.div`
    :is(&:hover, .parent:hover &) .child {
      color: red;
      .grandchild {
        color: blue;
      }
    }
  `;
  ```

  The grandchild rule used to compile to `:is(.card-class:hover .grandchild, .parent:hover .card-class) .child .grandchild { color: blue; }`, where the `.grandchild` token leaked into the `:is()` parens. It now compiles correctly to `:is(.card-class:hover, .parent:hover .card-class) .child .grandchild { color: blue; }`. The same fix applies to commas inside `[attr*="a,b"]` and other paren/bracket-protected contexts.

- In React Native apps (both native and react-native-web), animating a multi-argument transform shorthand (`translate(x, y)`, `translate3d(x, y, z)`, or `scale(x, y)`) inside `@keyframes` or a `transition` no longer throws "Transform with key of translate must have an array as the value". These forms now animate correctly per axis. Single-axis forms and uniform `scale(n)` were already fine. ([native-animated-translate-shorthand.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-animated-translate-shorthand.md))
- Fixed native parsing of comma-separated `animation-composition` so each value pairs with the matching `animation-name` entry when you run multiple animations, instead of treating the whole declaration as a single invalid keyword. ([native-animation-composition-longhand.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-animation-composition-longhand.md))
- `aspect-ratio` on React Native now accepts the same common forms as CSS: `16 / 9`, `auto`, `auto 16 / 9`, and `16 / 9 auto`. When `auto` is combined with a ratio on a component that does not have its own natural dimensions, styled-components uses the ratio and shows a one-time development warning explaining that the `auto` part only applies to image-like elements. ([native-aspect-ratio-auto.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-aspect-ratio-auto.md))
- `background-size: cover` and `background-size: contain` on React Native no longer crash the app when applied to gradient backgrounds. Gradients now paint across the full element area as expected. `react-native-web` still receives the original keyword so the browser can handle it directly. ([native-background-keyword-crash-fix.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-background-keyword-crash-fix.md))

  `background-position` values like `0 0`, `50% 50%`, and `top left` also no longer trigger a `react-native-web` warning.

- The `background` shorthand works on React Native, including multiple layers, `position / size`, and a color on the final layer. Unsupported attachment, origin, and clipping warn in development on native while web builds keep the full declaration. Invalid position, size, and repeat values are ignored instead of forwarded; invalid layered longhands now warn in development too. ([native-background-shorthand.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-background-shorthand.md))
- Fixes React Native edge cases for layered backgrounds when every comma-separated layer repeats the same position, size, or repeat, including values produced by the `background` shorthand. Simple center combinations such as `center top` fold to a single keyword (`top`) without changing layout. ([native-bg-comma-collapse.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-bg-comma-collapse.md))
- Fixes border line styles on React Native: `hidden` acts like no border, repeated sides collapse without noise, mixed sides keep the first drawable style with a development warning, and unsupported keywords such as `double` are ignored instead of rendering as the wrong border. Web builds keep CSS border styles as authored. ([native-border-line-styles.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-border-line-styles.md))
- Slash-separated `border-radius` values that are still circular (for example `10px / 10px`) now render on native. Truly elliptical combinations are ignored with a development warning instead of painting incorrect corners. Web builds keep the authored value. ([native-border-radius-elliptical.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-border-radius-elliptical.md))
- React Native: passing `prop={undefined}` to a styled component opts out of an `attrs()`-provided default, matching web behavior. `<Comp accessible={undefined} />` renders with no `accessible` prop even when the component has `.attrs({ accessible: true })`. ([native-bug-fixes-alpha.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-bug-fixes-alpha.md))
- `direction: ltr` and `direction: rtl` now work in React Native styles. Logical edges such as `margin-inline-start` and `padding-inline-end` follow that direction, so the same declaration can support left-to-right and right-to-left layouts on iOS, Android, and the web. ([native-direction-passthrough.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-direction-passthrough.md))
- Fixes React Native spec-compliance edge cases in the `flex` shorthand. `flex: initial` and a zero basis after grow and shrink factors now match CSS behavior, while invalid negative grow, shrink, and basis values are ignored. ([native-flex-shorthand.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-flex-shorthand.md))
- `font-style: oblique` maps to `italic` on React Native; an angle triggers a one-time development warning. Unsupported standalone `line-height` (percentages, `em`, `rem`) and relative `letter-spacing` warn with suggested replacements; percentage line height inside the `font` shorthand resolves when font size is known. Web builds keep browser-handled values. ([native-font-style-oblique-lineheight-letterspacing.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-font-style-oblique-lineheight-letterspacing.md))
- Generic `font-family` keywords such as `serif`, `sans-serif`, `monospace`, `system-ui`, `ui-rounded`, `emoji`, and `math` now map to an appropriate platform font on iOS and Android. `react-native-web` still passes the keyword to the browser. When a React Native font list contains multiple comma-separated families, styled-components uses the first one and shows a one-time development warning because React Native accepts only one font family. ([native-generic-font-families.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-generic-font-families.md))
- `interactivity: inert` now applies on React Native: the styled component and its subtree stop responding to touch, no longer accept D-pad / keyboard focus, and are hidden from screen readers (VoiceOver on iOS, TalkBack on Android). One known gap surfaces via a one-time dev warning on Android: a focusable child rendered inside an inert subtree may still receive focus, because React Native does not propagate that flag down the tree. ([native-interactivity-inert.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-interactivity-inert.md))

  `react-native-web` lets the browser honor the property natively via the HTML `inert` attribute.

- `letter-spacing` now accepts the full CSS length grammar on React Native. Absolute lengths (`pt`, `pc`, `in`, `cm`, `mm`, `Q`) fold to dp at compile time. Font-relative units (`em`, `rem`, `lh`, `rlh` plus the font-metric forms `ex`, `cap`, `ch`, `ic` and their `r`-variants), viewport units, and container-query units resolve at render time against the current environment. Numbers, `px`, and `normal` continue to work; truly unsupported units still drop with a development warning. ([native-letter-spacing-font-relative.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-letter-spacing-font-relative.md))
- Logical border shorthands now expand on React Native: ([native-logical-border-shorthands.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-logical-border-shorthands.md))
  - Per-edge color, style, and width declarations such as `border-inline-start-color` and `border-block-end-width`.
  - Axis shorthands such as `border-inline-color`, `border-block-width`, `border-inline`, and `border-block`.
  - Single-edge shorthands such as `border-inline-start` and `border-block-end`.

  Width and color apply to the matching logical edge. Per-edge border styles now show a one-time development warning on React Native, because the platform only supports one `border-style` for the whole element. `react-native-web` continues to let the browser handle per-edge styles. `outline-style: hidden` also now gets a clearer warning.

- On React Native (Expo and other Metro projects), importing from `styled-components/native` could pull React Native Web into your iOS and Android bundles, bloating them and breaking styling on device. The correct build is now selected automatically for each platform, so React Native Web stays out of native bundles and no custom Metro resolver workaround is needed. ([native-metro-platform-resolution.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-metro-platform-resolution.md))
- `object-fit` on a styled Image now applies correctly across iOS, Android, and the web. Previously the value reached the underlying Image differently on each target, leaving the web bar without the requested fit. ([native-object-fit-rnweb.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-object-fit-rnweb.md))
- `perspective` now works as a standalone property on React Native, so it can be combined with child transforms like `rotateY` or `rotateX` to create depth. Very small values are clamped to `1px` to match browser behavior. `transform-style: preserve-3d` shows a one-time development warning on iOS and Android because React Native does not expose that behavior yet; `react-native-web` continues to let the browser handle both properties. ([native-perspective-transform-style.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-perspective-transform-style.md))
- Fixes React Native spec-compliance edge cases in the `place-content` shorthand. `start`, `end`, and `space-evenly` now match CSS Box Alignment behavior. ([native-place-content.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-place-content.md))
- `place-items` and `place-self` shorthands now work on React Native. As on the web, the second value defaults to the first when omitted. Keywords like `start`, `end`, `self-start`, and `self-end` produce the same layout on iOS, Android, and `react-native-web`. ([native-place-items-self.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-place-items-self.md))
- `rem` length values now work on React Native. They use the app's root font size, `16` by default, so `width: 1rem` becomes `16` and `width: 2rem` becomes `32`. `rem` works on its own and inside `calc()`. `react-native-web` continues to let the browser handle it. ([native-rem-unit.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-rem-unit.md))
- `text-wrap-mode` and `text-wrap-style` can now be set directly on React Native. Previously only the `text-wrap` shorthand was supported. `nowrap` clips text to a single line, and on Android, `balance` and `pretty` use the platform's higher-quality line breaking. ([native-text-wrap-longhands.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-text-wrap-longhands.md))
- `transform-box` now shows a one-time development warning on iOS and Android explaining that React Native transforms use the view center as their reference box. Use `transform-origin` when you need to move the pivot point. `react-native-web` continues to let the browser handle `transform-box`. ([native-transform-box-warn.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-transform-box-warn.md))
- Development builds now warn when `vertical-align` is set on a native `<Text>` or `<TextInput>` running on iOS. ([native-vertical-align-ios-warning.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-vertical-align-ios-warning.md))

  React Native 0.85 has no platform API for vertically aligning text content inside a fixed-height `<Text>` or `<TextInput>` on iOS, so the declaration silently has no effect there. Android and rn-web continue to render the property as authored. For `<Text>`, the warning points to the workaround: wrap the Text in a View and use `justify-content` for the vertical alignment. `<TextInput>` has no Text-level workaround on iOS today.

- `vertical-align: top | middle | bottom` on a styled `<Text>` now positions text content within the Text's box on `react-native-web`, matching the visual semantic of React Native's `verticalAlign` on Android (textAlignVertical). Other `vertical-align` values pass through unchanged so the browser's native baseline-shifting semantics still apply. ([native-web-vertical-align-content.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-web-vertical-align-content.md))
- React Native: when you opt into the Reanimated animation adapter, authored CSS animations and keyframes now run on the UI thread as intended instead of being ignored. Reduced motion collapses CSS-layer durations and delays to zero, and `@starting-style` entry transitions coordinate a two-frame paint so transitions can start from the declared starting snapshot. ([reanimated-css-keyframes.md](https://github.com/styled-components/styled-components/commits/main/.changeset/reanimated-css-keyframes.md))
- On react-native-web, parallel animations that use additive composition (`add` or `accumulate`) now pass `animation-composition` through to the browser so layered effects compose per CSS Animations Level 2. When every effect uses the default `replace` composition, the cascade is unchanged. ([rn-web-animation-composition-style.md](https://github.com/styled-components/styled-components/commits/main/.changeset/rn-web-animation-composition-style.md))
- Fixed a styling leak when a nested `<StyleSheetManager>` sits beside other children of an outer `<StyleSheetManager>` in a server component tree. ([rsc-nested-stylesheetmanager.md](https://github.com/styled-components/styled-components/commits/main/.changeset/rsc-nested-stylesheetmanager.md))

  ```jsx
  <StyleSheetManager plugins={[outerPlugin]}>
    <ChildA />
    <StyleSheetManager plugins={[innerPlugin]}>
      <ChildB />
    </StyleSheetManager>
    <ChildC />
  </StyleSheetManager>
  ```

  Previously `ChildC` was being styled with the inner manager's plugins because the inner subtree's configuration leaked back out. `ChildC` now correctly uses the outer manager's plugins.

- Server-side output escapes `</style>` substrings (rewritten as the CSS hex escape `\3C/style`, which the CSS engine still parses identically) and HTML-escapes nonce values before they reach the rendered `<style ...>` tag, so user-supplied content interpolated into styles can't break out and inject markup. In-browser style injection is unaffected. ([ssr-xss-hardening.md](https://github.com/styled-components/styled-components/commits/main/.changeset/ssr-xss-hardening.md))
- Fixed plain objects with a custom `toString()` being expanded as CSS-property blocks instead of stringified. Useful for design-token shapes where the token resolves to a default value but also carries alternate sub-values: ([toString-design-tokens.md](https://github.com/styled-components/styled-components/commits/main/.changeset/toString-design-tokens.md))

  ```ts
  const ink = {
    default: '#000',
    subtle: '#444',
    toString() {
      return this.default;
    },
  };

  const Heading = styled.h1`
    color: ${ink};
  `;
  ```

## 6.4.1

### Patch Changes

- 49d09ae: Fix a performance regression in 6.4.0 where dynamic `createGlobalStyle` components caused significant re-render slowdowns. Also restores pre-6.4 cascade ordering when multiple instances of the same `createGlobalStyle` coexist.
- eca95b2: Fix outdated dev-mode error messages for keyframes-in-untagged-strings and component-selector references that still pointed at `www.styled-components.com` and described behavior from styled-components v3.

## 6.4.0

### Minor Changes

- b0f3d29: `.attrs()` improvements: props supplied via attrs are now automatically made optional on the resulting component (previously required even when attrs provided a default). Also fixes a bug where the attrs callback received a mutable props object that could be changed by subsequent attrs processing; it now receives an immutable snapshot.
- 2a973d8: Dropped IE11 support: ES2015 build target, inlined unitless CSS properties (removing @emotion/unitless dependency), removed legacy React class statics from hoist and other unnecessary code.
- 9e07d95: Add `createTheme(defaultTheme, options?)` for CSS variable theming that works across RSC and client components.

  Returns an object with the same shape where every leaf is `var(--prefix-path, fallback)`. Pass it to `ThemeProvider` for stable class name hashes across themes (no hydration mismatch on light/dark switch).

  ```ts
  const theme = createTheme({ colors: { primary: '#0070f3' } });
  // theme.colors.primary → "var(--sc-colors-primary, #0070f3)"
  // theme.raw → original object
  // theme.vars.colors.primary → "--sc-colors-primary"
  // theme.resolve(el?) → computed values from DOM (client-only)
  // theme.GlobalStyle → component that emits CSS var declarations
  ```

  `vars` exposes bare CSS custom property names (same shape as the theme) for use in `createGlobalStyle` dark mode overrides without hand-writing variable names:

  ```ts
  const { vars } = createTheme({ colors: { bg: '#fff', text: '#000' } });

  const DarkOverrides = createGlobalStyle`
    @media (prefers-color-scheme: dark) {
      :root {
        ${vars.colors.bg}: #111;
        ${vars.colors.text}: #eee;
      }
    }
  `;
  ```

  Options: `prefix` (default `"sc"`), `selector` (default `":root"`, use `":host"` for Shadow DOM).

- 79cc7b4: Add first-class CSP nonce support. Nonces can now be configured via `StyleSheetManager`'s `nonce` prop (recommended for Next.js, Remix), `ServerStyleSheet`'s constructor, `<meta property="csp-nonce">` (Vite convention), `<meta name="sc-nonce">`, or the legacy `__webpack_nonce__` global.
- b0f3d29: Rearchitect `createGlobalStyle` to use shared stylesheet groups.

  All instances of a `createGlobalStyle` component now share a single stylesheet group, registered once at definition time. This fixes unmounting one instance removing styles needed by others (#5695), styles scattering after remount (#3146), and group ID leaks during SSR (#3022).

  CSS injection order is now fully determined at definition time (lower group ID = earlier in stylesheet). Render order no longer affects CSS order. Keyframes defined before a component correctly appear before that component's rules.

  Also fixes: O(n^2) performance regression in jsdom test environments from unbounded rule accumulation, and stale static global styles during client-side HMR (effect deps now include the `globalStyle` reference so module re-evaluation triggers re-injection).

- b0f3d29: Significant render performance improvements via three-layer memoization and hot-path micro-optimizations. Client-only; server renders are unaffected.

  Re-renders that don't change styling now skip style resolution entirely. Components sharing the same CSS (e.g., list items) benefit from cross-sibling caching. Hot-path changes include `forEach` → `for`/`for...of`, template literal → manual concat, and reduced allocations.

  Benchmarks vs 6.3.12:
  - **Parent re-render (most common):** 3.3x faster
  - **First mount:** 1.7-2.5x faster
  - **Prop cycling:** 2.3-2.4x faster
  - **10K heavy layouts:** 1.9x faster
  - No regressions on any benchmark

- 9ada92b: React Server Components support: inline style injection, deduplication, and a new `stylisPluginRSC` for child-index selector fixes.

  **Inline style injection:** RSC-rendered styled components emit `<style data-styled>` tags alongside their elements. CSS is deduplicated per render via `React.cache` (React 19+). Extended components use `:where()` zero-specificity wrapping on base CSS so extensions always win the cascade regardless of injection order.

  **`StyleSheetManager` works in RSC:** `stylisPlugins` and `shouldForwardProp` are now applied in server component environments where React context is unavailable.

  **`stylisPluginRSC`** — opt-in stylis plugin that fixes `:first-child`, `:last-child`, `:nth-child()`, and `:nth-last-child()` selectors broken by inline `<style>` tags shifting child indices. Rewrites them using CSS Selectors Level 4 `of S` syntax to exclude styled-components style tags from the count.

  ```jsx
  import { StyleSheetManager, stylisPluginRSC } from 'styled-components';

  <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>{children}</StyleSheetManager>;
  ```

  The plugin rewrites `:first-child`, `:last-child`, `:nth-child()`, and `:nth-last-child()` using CSS Selectors Level 4 `of S` syntax to exclude injected style tags from the child count.

  Browser support: Chrome 111+, Firefox 113+, Safari 9+ (~93% global). In unsupported browsers, the entire CSS rule is dropped — only opt in if your audience supports it. Use `:first-of-type` / `:nth-of-type()` as a universally compatible alternative.

  **HMR:** Stale styles during client-side HMR are detected and invalidated when module re-evaluation creates new component instances while IDs remain stable (SWC plugin assigns IDs by file location). `createGlobalStyle` additionally clears stale sheet entries when the instance changes between renders.

  The plugin is fully tree-shakeable — zero bytes in bundles that don't import it.

### Patch Changes

- b0f3d29: Expose `as` and `forwardedAs` props in `React.ComponentProps` extraction for styled components
- 553cbb4: Fix memory leak in long-running apps using components with free-form string interpolations (e.g. `color: ${p => p.$dynamicValue}` where the value comes from unbounded user input).
- b0f3d29: React Native improvements: replaced postcss with a lightweight CSS declaration parser, fixing `nanoid` crashes in Expo/Metro (#5705) and improving parse speed 4-6x. Parent re-renders with unchanged children are 2.6-3.2x faster via cache-first render. Updated native component alias list (removed 5 dead components, added 4 missing). Added `react-native` as an optional peer dependency.
- 74e8b76: Smaller install footprint via unused dependency cleanup.

## 6.3.12

### Patch Changes

- db4f940: Fix test performance regression in 6.3.x by eliminating double style rendering in `createGlobalStyle` and removing unnecessary DOM queries during cleanup in client/test environments.
- 1203f80: Fix React Native crash caused by `document` references in the native build. The native bundle no longer includes DOM code, resolving compatibility with RN 0.79+ and Hermes.
- 5ef3804: Gracefully handle CSS syntax errors in React Native instead of crashing. Missing semicolons and other syntax issues now log a warning in development and produce an empty style object instead of throwing a fatal error.
- a777f5a: Preserve explicitly passed `undefined` props instead of stripping them. This fixes compatibility with libraries like MUI and Radix UI that pass `undefined` to reset inherited defaults (e.g., `role={undefined}`). Props set to `undefined` via `.attrs()` are still stripped as before.

## 6.3.11

### Patch Changes

- 752f5ec: fix: resolve "React is not defined" ReferenceError introduced in 6.3.10 when loading the CJS build in Node.js

## 6.3.10

### Patch Changes

- f674224: fix: RSC style tags for extended components have correct href and include base CSS (#5663)
  - Fix spaces in `<style href>` attribute that caused React 19 hydration failures when using `styled()` inheritance
  - Fix missing base component CSS in RSC output when only the extended component renders
  - Emit a separate `<style>` tag per inheritance level with content-aware hrefs, enabling React 19 deduplication of shared base styles
  - Preserve correct CSS ordering (base before extended) for proper specificity override behavior

- f674224: Reduce standalone/browser bundle size by making IS_RSC a build-time constant, enabling dead code elimination of RSC-specific branches

## 6.3.9

### Patch Changes

- ca61aca: Fix CSS block comments containing `//` (e.g. URLs) causing subsequent styles to not be applied.
- a2cd792: Fix `createGlobalStyle` styles not being removed when unmounted in RSC environments. React 19's `precedence` attribute on style tags makes them persist as permanent resources; global styles now render without `precedence` so they follow normal component lifecycle.
- dbe0aae: In RSC environments, `theme` is now `undefined` instead of `{}` for styled components, matching the existing behavior of `withTheme` and `createGlobalStyle`. This ensures accessing theme properties without a ThemeProvider correctly throws rather than silently returning `undefined`.
- 1888c73: Fix `withTheme` HOC types: ref now correctly resolves to the component instance type instead of the constructor, and `theme` is properly optional in the wrapped component's props.
- f84f3fa: Fix SSR styles hydration and global style cleanup in Shadow DOM
- 43a5b4b: Optimize internal style processing hot paths: cached GroupedTag index lookups, string fast path in flatten, direct string concatenation in dynamic style generation, pre-built stylis middleware chain with lazy RegExp creation, single-lookup Map operations, VirtualTag append fast-path, and manual string concat in SSR output.
- 788e8c0: Revert `exports` field and restore browser/server build split with `browser` field in package.json. Fixes `require('stream')` resolution errors in browser bundlers like webpack 5.

## 6.3.8

### Patch Changes

- 55d05c1: Make react-dom an optional peer dependency, clean up some unnecessary type peers.

## 6.3.7

### Patch Changes

- 51ffa9c: Fix createGlobalStyle compatibility with React StrictMode and RSC

  This fix addresses issues where global styles would disappear or behave incorrectly in React StrictMode and RSC:
  1. **Static styles optimization**: Static global styles (without props/interpolations) are now only injected once and won't be removed/re-added on every render. This prevents the style flickering that could occur during concurrent rendering.

  2. **StrictMode-aware cleanup**: Style cleanup now uses `queueMicrotask` to coordinate with React's effect lifecycle. In StrictMode's simulated unmount/remount cycle, styles are preserved. On real unmount, styles are properly removed.

  3. **RSC compatibility**: Move `useRef` inside RSC guard in `createGlobalStyle` and unify all `useContext` calls to use consistent `!IS_RSC ?` pattern.

  4. **RSC inline style tag cleanup**: Fix bug where server-defined `createGlobalStyle` rendered in client components would leave behind accumulated SSR-rendered inline `<style data-styled-global>` tags. The cleanup effect now removes these hoisted style tags when the component unmounts or re-renders with different CSS.

  These changes ensure `createGlobalStyle` works correctly with:
  - React StrictMode's double-render behavior
  - React 18/19's concurrent rendering features
  - React 19's style hoisting with the `precedence` attribute
  - React Server Components (server-defined GlobalStyles in client components)

- 51ffa9c: Restore `styled.br`.
- 1f794b7: Add package.json "exports" field for better native ESM integration.

## 6.3.6

### Patch Changes

- 189bc17: Fix url() CSS function values being incorrectly stripped when using unquoted URLs containing `//` (e.g., `url(https://example.com)`). The `//` in protocol URLs like `https://`, `http://`, `file://`, and protocol-relative URLs was incorrectly being treated as a JavaScript-style line comment.

## 6.3.5

### Patch Changes

- 7ff7002: Fix: Line comments (`//`) in multiline CSS declarations no longer cause parsing errors (fixes #5613)

  JS-style line comments (`//`) placed after multiline declarations like `calc()` were not being properly stripped, causing CSS parsing issues. Comments are now correctly removed anywhere in the CSS while preserving valid syntax.

  **Example that now works:**

  ```tsx
  const Box = styled.div`
    max-height: calc(100px + 200px + 300px); // This comment no longer breaks parsing
    background-color: green;
  `;
  ```

- 7ff7002: Fix: Contain invalid CSS syntax to just the affected line

  In styled-components v6, invalid CSS syntax (like unbalanced braces) could cause all subsequent styles to be ignored. This fix ensures that malformed CSS only affects the specific declaration, not subsequent valid styles.

  **Example that now works:**

  ```tsx
  const Circle = styled.div`
    width: 100px;
    line-height: ${() => '14px}'}; // ⛔️ This malformed line is dropped
    background-color: green; // ✅ Now preserved (was ignored in v6)
  `;
  ```

## 6.3.4

### Patch Changes

- 8e8c282: Fixed `createGlobalStyle` to not use `useLayoutEffect` on the server, which was causing a warning and broken styles in v6.3.x. The check `typeof React.useLayoutEffect === 'function'` is not reliable for detecting server vs client environments in React 18+, so we now use the `__SERVER__` build constant instead.

## 6.3.3

### Patch Changes

- 6e4d1e7: fix: suppress false "created dynamically" warnings in React Server Components

  The dynamic creation warning check now properly detects RSC environments and skips validation when `IS_RSC` is true. This eliminates false warnings for module-level styled components in server components, which were incorrectly flagged due to RSC's different module evaluation context. Module-level styled components in RSC files no longer trigger warnings since they cannot be created inside render functions by definition.

## 6.3.2

### Patch Changes

- a4b4a6b: fix: include TypeScript declaration files in npm package

  Fixed Rollup TypeScript plugin configuration to override tsconfig.json's noEmit setting, ensuring TypeScript declaration files are generated during build.

- a4b4a6b: fix: resolve TypeScript error blocking type declaration emission

  Fixed TypeScript error in StyledComponent when merging style attributes from attrs. Added explicit type cast to React.CSSProperties to safely merge CSS property objects. This error was preventing TypeScript declaration files from being generated during build.

## 6.3.1

### Patch Changes

- 046e880: Ensure TypeScript declaration files are included in npm package, needed to tweak a Rollup setting.

## 6.3.0

### Minor Changes

- 28fd502: Add React Server Components (RSC) support

  styled-components now automatically detects RSC environments and handles CSS delivery appropriately:
  - **No `'use client'` directive required**: Components work in RSC without any wrapper or directive
  - **Automatic CSS injection**: In RSC mode, styled components emit inline `<style>` tags that React 19 automatically hoists and deduplicates
  - **Zero configuration**: Works out of the box with Next.js App Router and other RSC-enabled frameworks
  - **Backward compatible**: Existing SSR patterns with `ServerStyleSheet` continue to work unchanged

  RSC best practices:
  - Prefer static styles over dynamic interpolations to avoid serialization overhead
  - Use data attributes for discrete variants (e.g., `&[data-size='lg']`)
  - CSS custom properties work perfectly in styled-components, can be set via inline `style`, and cascade to children:

  ```tsx
  const Container = styled.div``;
  const Button = styled.button`
    background: var(--color-primary, blue);
  `;

  // Variables set on parent cascade to all DOM children
  <Container style={{ '--color-primary': 'orchid' }}>
    <Button>Inherits orchid background</Button>
  </Container>;
  ```

  - Use build-time CSS variable generation for theming since `ThemeProvider` is a no-op in RSC

  Technical details:
  - RSC detection via `typeof React.createContext === 'undefined'`
  - `ThemeProvider` and `StyleSheetManager` become no-ops in RSC (children pass-through)
  - React hooks are conditionally accessed via runtime guards
  - CSS is retrieved from the StyleSheet Tag for inline delivery in RSC mode

- 856cf06: feat: update built-in element aliases to include modern HTML and SVG elements

  Added support for modern HTML and SVG elements that were previously missing:

  HTML elements:
  - `search` - HTML5 search element
  - `slot` - Web Components slot element
  - `template` - HTML template element

  SVG filter elements:
  - All `fe*` filter primitive elements (feBlend, feColorMatrix, feComponentTransfer, etc.)
  - `clipPath`, `linearGradient`, `radialGradient` - gradient and clipping elements
  - `textPath` - SVG text path element
  - `switch`, `symbol`, `use` - SVG structural elements

  This ensures styled-components has comprehensive coverage of all styleable HTML and SVG elements supported by modern browsers and React.

### Patch Changes

- 418adbe: fix(types): add CSS custom properties (variables) support to style prop

  CSS custom properties (CSS variables like `--primary-color`) are now fully supported in TypeScript without errors:
  - `.attrs({ style: { '--var': 'value' } })` - CSS variables in attrs
  - `<Component style={{ '--var': 'value' }} />` - CSS variables in component props
  - Mixed usage with regular CSS properties works seamlessly

- aef2ad6: Update shared css property handling tools to latest versions.

## 6.2.0

### Minor Changes

- e7c8055: Experimental support for React 18+ renderToPipeableStream.

### Patch Changes

- d0b73ac: Fix no longer existing link in console debug message
- 8a9c21b: Upgrade stylis to 4.3.6. [Related commits](https://github.com/thysultan/stylis/commits/master/?since=2024-08-01&until=2025-09-11)
- a21089e: Update internal React types to ^18
- c3a5990: Update csstype dependency from 3.1.3 to 3.2.3

  This updates the pinned csstype dependency from 3.1.3 to 3.2.3 to fix a
  type incompatibility with @types/react.

## 6.1.19

### Patch Changes

- aa997d8: fix for React Native >=0.79 crashes when using unsupported web-only CSS values (e.g., fit-content, min-content, max-content). The fix emits a warning and ignores the property using those values, instead of causing crashes.

## 6.1.18

### Patch Changes

- 76b18a4: fix react 19 compatibility
- bdac7af: Quickfix to support expo sdk >= 53 and react-native >=0.79.

## 6.1.17

### Patch Changes

- 47a4dcb: Fix for loose `DefaultTheme` type definition
- a8c0f5b: fix: add info link to console

## 6.1.16

### Patch Changes

- 246c77b: Resolve TS error related to `ExoticComponentWithDisplayName` API from React.
- 4757191: Native typings weren't on the correct folder, which caused issues on React Native projects using this library

## 6.1.15

### Patch Changes

- b9688ae: chore: update postcss to version 8.4.49 and nanoid to version 3.3.8

## 6.1.14

### Patch Changes

- 6908326: Add changesets for release management
- 18ebf6d: Prevent styled() from injecting an undefined ref prop in React 19
