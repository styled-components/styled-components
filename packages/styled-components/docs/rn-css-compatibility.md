# React Native CSS Features Compatibility

This is a living index of modern CSS capabilities and their current state on the React Native path. Features are grouped into what works today, what we polyfill, and what still needs upstream React Native support to become usable.

The goal is transparency: if you rely on something in this document, you can see whether it runs today, how we handle it under the hood, and what would need to change upstream to move a "not supported" row into the "polyfilled" or "native" column.

If a feature you need isn't listed, or the workaround section needs updating, open a comment or pull request to extend this file.

## Status snapshot

As of React Native 0.85:

- **~63** modern CSS features work natively (transforms, box-shadow with spread/inset, filter chains, gradients, slash-alpha colors, `hwb()`, `mix-blend-mode`, `isolation`, `cursor`, grid layout, logical margin/padding/border longhands, container queries, and more).
- **~58** features that React Native does not parse natively are polyfilled by styled-components — either rewritten to an RN-compatible form at compile time or resolved at render time against the device environment.
- **~71** features still require upstream React Native work to support meaningfully. This document is a contract with the community: when one of those ships, we wire it up and move the row out of the unsupported section.

## Works natively in React Native 0.85

- `transform: translateX(n) rotate(45deg) scale(1.2) matrix(...)` — the whole transform function family, including `matrix()` / `matrix3d()` and bare-number translate values.
- `box-shadow` with offset, blur, spread, inset, and multi-shadow lists.
- `filter: blur() brightness() contrast() drop-shadow() grayscale() hue-rotate() invert() opacity() saturate() sepia()` chains.
- `background-image: linear-gradient()` / `radial-gradient()` / `url()` + `background-size` / `background-position` / `background-repeat`.
- Colors: hex, `rgb()` / `rgba()`, `rgb(r g b / a)` slash-alpha, `hsl()` / `hsla()`, `hwb()`, named colors, `currentColor`, `transparent`.
- `mix-blend-mode`, `isolation`, `cursor`, `pointer-events`, `user-select`.
- Grid layout: `display: grid`, `grid-template-*`, `grid-auto-*`, `grid-column`, `grid-row`, `gap` / `row-gap` / `column-gap`, `place-content`, `place-items`.
- Flex: `flex`, `flex-flow`, `flex-grow` / `flex-shrink` / `flex-basis`, `align-items`, `justify-content`, `align-content` (flex/grid).
- Logical margin / padding / border longhands (`margin-inline-start`, `padding-block-end`, `border-inline-end-width`, `inset-inline-start`, etc.) and their `-top` / `-bottom` / `-left` / `-right` counterparts.
- `aspect-ratio`, `opacity`, `overflow`, `outline`, `outline-offset`, `border-radius`, `container-type`, `container-name`.
- Position: `absolute` / `relative` / `static`.

## Polyfilled by styled-components

These work in your style templates even though React Native doesn't parse them natively. styled-components either rewrites the value before handing it to React Native, or re-evaluates it on each render against the live environment.

### Compile-time polyfills (no render cost)

| Feature | Handled as |
| --- | --- |
| `calc()` / `min()` / `max()` / `clamp()` with static arms | Resolved to a number or `'N%'` at compile time. |
| `oklch()`, `oklab()`, `lch()`, `lab()` with static channels | Converted to sRGB hex. |
| `color-mix(in <space>, colorA [p%], colorB [p%])` with literal operands | Mixed in the requested space (`srgb`, `oklab`, `oklch`, `lab`, `lch`) per CSS Color Level 5; perceptual spaces use proper round-trip + shorter-arc hue. |
| `margin-inline` / `margin-block` / `padding-inline` / `padding-block` / `inset-inline` / `inset-block` shorthands | Expanded to the two-longhand pair React Native already supports. |
| `line-clamp: N` | Emitted as `{ numberOfLines: N, overflow: 'hidden' }`. |
| `&:is(:stateA, :stateB, …)` / `&:where(…)` | Fanned out into parallel pseudo-state buckets covering each named state. |
| `linear()` easing | Parsed to a piecewise-linear lookup table for the v7.1 animation adapter. |
| `@starting-style { … }` | Captured on the compile output for the v7.1 animation adapter. |

### Render-time polyfills

These values re-resolve each render against the device's current state. Components that don't use any of them pay zero cost.

| Feature | Resolution source |
| --- | --- |
| `vw` / `vh` / `vmin` / `vmax` / `dvh` / `svh` / `lvh` / `dvw` / `svw` / `lvw` | `Dimensions.get('window')` (re-measures on rotation / resize). |
| `cqw` / `cqh` / `cqmin` / `cqmax` / `cqi` / `cqb` | Nearest registered container's `onLayout` size. |
| `light-dark(light, dark)` | `Appearance.getColorScheme()` — swaps when OS theme changes. |
| `env(safe-area-inset-top | right | bottom | left)` | `useSafeAreaInsets()` (SafeAreaProvider context). |
| `var(--path)` via `createTheme(...)` leaves | Deep-merged `ThemeProvider` stack. |

### React Native pseudo-states (equivalent to CSS pseudo-classes)

| CSS | React Native mapping |
| --- | --- |
| `&:hover` | `Pressable` hover state (desktop / web) or `onHoverIn`/`onHoverOut` (iOS pencil / desktop-like). |
| `&:focus` / `&:focused` | `onFocus`/`onBlur` on focusable inputs. |
| `&:active` / `&:pressed` | `Pressable` pressed state. |
| `&:disabled` | Component `disabled` prop. |

## Not yet supported (compatibility tracker)

These features depend on upstream React Native primitives that do not yet exist. Each row lists what's missing, the workaround we recommend today, and (where known) the upstream request to follow or support. When a row ships in a React Native release, we'll wire it up and move it out of this section.

### Layout & positioning

| Feature | Why unsupported | Workaround |
| --- | --- | --- |
| `position: fixed` | React Native has no top-layer / viewport-anchored positioning primitive. | Use `Modal` or a portal-style overlay component. |
| `position: sticky` | Only `FlatList`'s `stickyHeaderIndices` exists; no CSS-level sticky. | Use `FlatList` sticky headers. |
| `display: contents` | No DOM tree on RN. | Flatten the element; use flexbox layout instead. |
| `display: flow-root` | No block-formatting-context concept on RN. | Use a plain `View`. |
| `subgrid` | React Native's grid backend is single-level. | Restructure with nested grids. |
| `masonry` / `grid-lanes` / masonry-style layout | Experimental on web; not on the RN roadmap. | Use `FlatList` with multiple columns. |
| `anchor-position` family (`anchor-name`, `position-area`, `anchor(...)`, `position-try`) | No CSS-level anchor positioning primitive on RN. | Use popover libraries or `Modal` + measured coordinates. |
| `reading-flow` / `reading-order` | RN's accessibility model uses `accessibilityRole` / focus traversal, not CSS. | Use `accessibilityElementsHidden` / `importantForAccessibility`. |

### Colors & rendering

| Feature | Why unsupported | Workaround |
| --- | --- | --- |
| `color-contrast()` | Needs rendered-color analysis primitive; only shipped in Safari today. | Tune an `oklch` lightness threshold manually or select colors via a theme helper. |
| System colors (`CanvasText`, `ButtonFace`, …) | No semantic system-color constants on RN. | Map to concrete values in your theme (or use `PlatformColor()`). |
| `@media (color-gamut: srgb | p3 | rec2020)` | No color-space capability query on RN. | Assume sRGB; re-evaluate if wide-gamut support lands upstream. |
| `@media (dynamic-range: high)` / `@media (video-dynamic-range: high)` | No HDR capability query on RN. | Branch on other signals (explicit user toggle, platform API). |
| `@media (forced-colors: active)` | High-contrast mode is Windows-only on web; no RN equivalent. | Use RN's `AccessibilityInfo.highTextContrast` where available. |
| `backdrop-filter` | No native backdrop-blur primitive on RN. | Use `BlurView` from `@react-native-community/blur` or Skia. |
| `background-blend-mode` | Only `mix-blend-mode` is implemented upstream. | Compose layered `View`s with opacity. |
| `conic-gradient()` | Not implemented in React Native's gradient parser. | Use `react-native-linear-gradient` / Skia for custom paint. |
| `border-style: double` | Only `solid`, `dashed`, `dotted` supported. | Use a nested border + inner padding. |

### Typography & text

| Feature | Why unsupported | Workaround |
| --- | --- | --- |
| `text-shadow` | `Text` doesn't render shadows. | Layer a duplicate offset `Text` with reduced opacity. |
| `text-decoration-style: dashed | dotted | wavy | double` | Only `solid` is supported. | Accept `solid`; consider a custom underline view if needed. |
| `text-wrap: balance | pretty | stable` | No text-wrapping algorithm control on RN. | Split text manually at known break points. |
| `hanging-punctuation` | Safari-only on web; not implemented on RN. | Manual layout tweaks. |
| `initial-letter` | Drop-cap primitive missing. | Render the first letter as a separate sized component. |
| `line-break: auto | loose | normal | strict` | East-Asian line-breaking rules missing. | Use a CJK-aware text component when needed. |
| `word-spacing` | `Text` doesn't expose word-spacing. | Accept default; use `letter-spacing` if similar effect helps. |
| `font-synthesis` | No control over synthetic font generation. | Link the real weight variants in your native build. |
| `font-palette` / `@font-palette-values` | Color fonts (COLR / SVG) aren't supported on RN yet. | Use multiple font files keyed by palette. |
| `text-box-trim` / `text-box-edge` | `Text` can't measure glyph metrics. | Adjust `line-height` and vertical padding manually. |
| `hyphens: auto` | No hyphenation engine exposed. | Insert soft-hyphens (`­`) in content. |
| `field-sizing: content` | No auto-size on `TextInput`. | `onContentSizeChange` + controlled height state. |

### Animations & transitions

| Feature | Why unsupported | Workaround |
| --- | --- | --- |
| `transition` shorthand / longhands | RN uses `Animated` / Shared Animation Backend, not CSS transitions. | Use `Animated.timing` / `Animated.spring` — the upcoming v7.1 animation adapter will bridge CSS transitions automatically. |
| `animation` / `@keyframes` execution | Keyframes are captured by the compiler but not yet applied. | Use `Animated` / `useNativeDriver: true` — v7.1 bridges this. |
| `animation-timeline: scroll() | view()` | No scroll-timeline binding on RN. | Use a `ScrollView` `onScroll` listener + `Animated.Value.interpolate`. |
| `view-transition` (L1 / L2) | Single-view architecture; MPA transitions don't apply. | Use screen-transition animations via `React Navigation`. |

### Scrolling & interaction

| Feature | Why unsupported | Workaround |
| --- | --- | --- |
| `scroll-behavior: smooth` | Not CSS-mappable on RN. | Use `ScrollView.scrollTo({ animated: true })`. |
| `scroll-snap-*` (full) | `FlatList` has limited `snapToInterval`; no arbitrary CSS-level snap. | Use `FlatList` snap props or gesture handlers. |
| `scroll-padding`, `scroll-margin` | Depends on full scroll-snap support. | Inline offsets in `contentContainerStyle`. |
| `overscroll-behavior: contain | none` | Partially addressable via `bounces={false}`. | Set `bounces`/`alwaysBounceVertical` props directly. |
| `touch-action` (CSS) | RN gesture handlers handle this implicitly. | Configure `Pressable`/`GestureHandler` props. |
| `resize: both | horizontal | vertical` | No resize-handle primitive. | Build a custom drag handle with pan gestures. |
| `caret-color` | `TextInput` doesn't expose caret color. | Use a custom input implementation when needed. |

### Selectors that depend on the DOM

| Feature | Why unsupported | Workaround |
| --- | --- | --- |
| `:has()` (parent selector) | No DOM tree / sibling inspection on RN. | Lift state up or use context. |
| `:nth-child()`, `:first-child`, `:last-child`, `:only-child`, `:empty` | No sibling position / child-count information. | Use render-time conditional logic on list indices. |
| `:target` | No URL fragment routing on RN. | Branch on route params. |
| `:defined` | No custom-element registry on RN. | N/A. |
| `:dir(ltr | rtl)` | No `writing-mode` support on RN. | Branch on `I18nManager.isRTL`. |
| Form-state pseudos `:checked`, `:required`, `:user-valid`, `:user-invalid`, `:placeholder-shown` | Form semantics differ on RN. | Use component state. |
| `:popover-open`, `:modal`, `:fullscreen` | No equivalent RN states. | Use component state. |

### At-rules

| Feature | Why unsupported | Workaround |
| --- | --- | --- |
| `@layer` (cascade layers) | No cascade on RN (flat style merge). | Use explicit style order in your components. |
| `@scope` | No selector scoping on RN. | Use component composition. |
| `@supports selector(...)` | No selector feature registry. | Branch on explicit feature checks. |
| `@font-palette-values` | Depends on color-font support. | Use multiple font files. |

### Environment variables

| Feature | Why unsupported | Workaround |
| --- | --- | --- |
| `env(keyboard-inset-*)` | Keyboard inset env variables are web-only currently. | Use `Keyboard.addListener` events. |
| `env(titlebar-area-*)` | Desktop PWA concept. | Not applicable to mobile RN. |
| `env(viewport-segment-*)` (foldable / dual-screen) | No foldable API on RN. | Use device-specific APIs. |
| `@media (prefers-reduced-data)` | No browser implementation yet. | Branch on explicit data-saver preference in your app. |

## Contributing

If you spot a feature missing from this list, or a workaround that's out of date, open a pull request against this file. When upstream React Native ships a primitive that lets us move a row out of the unsupported section, the same PR should update the polyfill layer so the capability becomes available in styled-components immediately.
