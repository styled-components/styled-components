# styled-components

## 7.0.0

### Major Changes

- React Native: `createTheme()` works the same way it does on the web. Pass the returned object to `ThemeProvider`, reference leaves in your styled components, and the current theme resolves automatically. ([createTheme-native-parity.md](https://github.com/styled-components/styled-components/commits/main/.changeset/createTheme-native-parity.md))

  ```tsx
  import styled, { createTheme, ThemeProvider } from "styled-components/native";

  const theme = createTheme({
    colors: { bg: "#ffffff", text: "#111111" },
  });

  const Card = styled.View`
    background-color: ${theme.colors.bg};
    border-color: ${theme.colors.text};
  `;

  <ThemeProvider theme={{ colors: { bg: "#111", text: "#eee" } }}>
    <Card />
  </ThemeProvider>;
  ```

  A theme value reads as if its text were written in the template at that spot, so anything the template supports works through a theme too: units such as `rem`, `em` and `vw`, keywords, shorthands such as `margin` and `border`, color functions, system colors, `env()`, and media query breakpoints. In `${theme.space.md}px`, a theme number takes the `px` that follows it.

  - A theme value must be a single CSS value. One that holds a second declaration or a rule, such as `'red; position: absolute'`, is ignored in favor of the default, with a development warning.
  - A value that isn't text, such as a `PlatformColor`, works as a whole color value (`color`, `border-color`, the color in a `border` shorthand) and passes through to the style as given. Anywhere else, such as inside `box-shadow`, `calc()` or `color-mix()`, it uses the theme default, with a development warning.
  - Inside an `@keyframes` block in a component's styles, a theme value follows the active theme, including when the theme changes while the animation runs.
  - `env(safe-area-inset-*)` and `anchor()` values work in a theme default. A `ThemeProvider` value that adds one where the default had none is not supported.

  Nested `ThemeProvider`s on React Native deep-merge their theme objects so an inner override that only touches one leaf keeps the siblings it inherited; a child provider that sets `colors.text` keeps `colors.bg` from the ancestor. Behavior on the web is unchanged.

- A styled component does not honor `defaultProps`, and it does not inherit a wrapped component's `defaultProps`. React 19 removed `defaultProps` support from function components. ([drop-default-props.md](https://github.com/styled-components/styled-components/commits/main/.changeset/drop-default-props.md))

  Migration: use `.attrs()` for prop defaults. The object form always wins over user-provided props (this is intentional, see the attrs FAQ). The function form lets user-provided props override the default:

  ```tsx
  // Before (v6, no longer applies in v7)
  const Button = styled.button``;
  Button.defaultProps = { type: "button" };

  // After (object form always wins)
  const Button = styled.button.attrs({ type: "button" })``;

  // After (user-provided overrides allowed)
  const Button = styled.button.attrs<{ type?: string }>((p) => ({
    type: p.type ?? "button",
  }))``;
  ```

  For a default theme, wrap the tree in `<ThemeProvider theme={...}>` instead.

- Browser builds use a single fast injection path; dev and production behave identically. The `disableCSSOMInjection` prop on `<StyleSheetManager>` and the `SC_DISABLE_SPEEDY` / `REACT_APP_SC_DISABLE_SPEEDY` environment variables are removed, and there is no runtime toggle into a text-based injection mode. A new `extractCSS` export is available. ([extract-css-and-drop-speedy-toggle.md](https://github.com/styled-components/styled-components/commits/main/.changeset/extract-css-and-drop-speedy-toggle.md))

  To make CSS visible as text (for static-render pipelines, micro-frontend cloning, embedding into iframes or Shadow DOM, or extraction tooling), call `extractCSS()` after render to get the current CSS as a plain string:

  ```js
  import { extractCSS } from "styled-components";

  // after rendering
  const css = extractCSS();
  ```

  The result is plain CSS without the rehydration markers used by `ServerStyleSheet`, so it can be injected directly into another document, stamped into a cloned DOM tree, or written to disk.

- Mounting the same `createGlobalStyle` component multiple times emits its CSS only once. Rendering output stays byte-stable across SSR, client, and Server Components. ([global-style-useid.md](https://github.com/styled-components/styled-components/commits/main/.changeset/global-style-useid.md))
- React Native: `isolation: isolate` is supported on iOS, Android, and the web. Blended descendants (`mix-blend-mode`) composite against the isolated element's own group, matching across all three targets. Separately, when a `filter` on iOS uses effects the platform only renders at the experimental release level, development builds warn that the effect is invisible and that it suspends descendant `mix-blend-mode` compositing while mounted. ([isolation-isolate-android-layer.md](https://github.com/styled-components/styled-components/commits/main/.changeset/isolation-isolate-android-layer.md))
- React Native: CSS-to-style-object translation is built in. The native path supports a broad set of modern CSS: ([native-transform-layer.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-transform-layer.md))

  - `transform: matrix(...)` / `matrix3d(...)`.
  - `transform: translateX(10)` (bare number, no unit).
  - `background-image: linear-gradient(...)` / `radial-gradient(...)`.
  - `filter: blur(4px) saturate(1.5)` and the full filter-function chain.
  - Modern color notations: `rgb(r g b / a)` slash-alpha, `hwb()`, `hsl()`.
  - `box-shadow` with spread and inset.
  - `mix-blend-mode`, `isolation`, `cursor`.

  ```tsx
  import styled from "styled-components/native";

  const Tile = styled.View`
    background-image: linear-gradient(
      135deg,
      hsl(220 80% 60%),
      hsl(280 70% 50%)
    );
    filter: blur(2px) saturate(1.5);
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
    transform: matrix(1, 0, 0, 1, 8, 0);
  `;
  ```

  `border: none` emits `border-style: none` on native, matching the rest of the ecosystem.

  `text-decoration: underline` without a color follows the text color, matching CSS's `currentcolor` initial value; an authored color still applies (on iOS and the web; Android always paints decorations in the text color and warns in development when a color is authored).

  iOS setup note for filters: in React Native 0.85, the `filter` primitives `blur`, `saturate`, `hue-rotate`, `grayscale`, `contrast`, and `drop-shadow` only render when your iOS app opts into the SwiftUI-based filter backend. Set `ReactNativeReleaseLevel` to `experimental` in your iOS `Info.plist` (or `ios.infoPlist` in `app.json` for Expo) to enable it. `brightness` and `opacity` are supported without this flag.

- A nested `<StyleSheetManager>` without a `namespace` prop uses its parent's namespace, in client and server components alike. Its styles stay scoped to the parent's container. ([nested-manager-namespace.md](https://github.com/styled-components/styled-components/commits/main/.changeset/nested-manager-namespace.md))

  ```tsx
  <StyleSheetManager namespace="#app">
    <StyleSheetManager plugins={[myPlugin]}>
      <Card /> {/* styled under #app */}
    </StyleSheetManager>
  </StyleSheetManager>
  ```

  To render a subtree without the namespace, such as a portal mounted outside the container, pass `namespace=""` to its manager. Components under a manager that inherits a namespace get different class names than under one without it.

- Raised peer dependency floors: ([peer-floors.md](https://github.com/styled-components/styled-components/commits/main/.changeset/peer-floors.md))

  - `react` and `react-dom` now require `>= 19.0.0` (was `>= 16.8`).
  - `react-native` now requires `>= 0.85.0` (was `>= 0.68`).
  - `css-to-react-native` is no longer a peer dependency. Apps that listed it solely for styled-components can drop it from their `package.json`.

  Older React / React Native projects should stay on styled-components v6.

- Plugins moved to a dedicated `styled-components/plugins` subpath, and first-party plugins ship there. ([plugins-subpath.md](https://github.com/styled-components/styled-components/commits/main/.changeset/plugins-subpath.md))

  ```tsx
  import { StyleSheetManager } from "styled-components";
  import { rtlPlugin, rscPlugin } from "styled-components/plugins";

  <StyleSheetManager plugins={[rtlPlugin]}>
    <App />
  </StyleSheetManager>;
  ```

  The `stylisPlugins` prop on `<StyleSheetManager>` is now `plugins`, the top-level `stylisPluginRSC` export has moved into the new subpath as `rscPlugin`, and the `enableVendorPrefixes` prop has been removed in favor of the opt-in `prefixPlugin`.

  Migration:

  ```diff
  -import { rtl, stylisPluginRSC } from 'styled-components';
  +import { prefixPlugin, rtlPlugin, rscPlugin } from 'styled-components/plugins';

  -<StyleSheetManager stylisPlugins={[rtl, stylisPluginRSC]} enableVendorPrefixes>
  +<StyleSheetManager plugins={[prefixPlugin, rtlPlugin, rscPlugin]}>
  ```

  In server components, placing this manager in a Next.js layout to style every page has been removed in favor of `configureServerStyles({ plugins: [rscPlugin] })`, called at the top of the root layout file.

  `rtlPlugin` replaces `stylis-plugin-rtl` for users coming from v6: it swaps physical side properties (`padding-left` / `padding-right`), flips `left` / `right` keyword values on `float` / `clear` / `text-align` / `caption-side`, and mirrors 4-value shorthand positions. Logical properties like `margin-inline-start` pass through unchanged.

  `prefixPlugin` adds vendor prefixes to the CSS you author. It is opt-in per subtree; a `<StyleSheetManager>` without it emits unprefixed CSS. The prefix set is scoped to the browsers that support the JavaScript APIs React requires (Chrome 45, Firefox 36, Safari 9 / iOS 9, Edge 12), and a construct is prefixed only where one of those browsers still needs it: `appearance`, `user-select`, `backdrop-filter`, `position: sticky`, `filter`, `clip-path`, the `mask*` family, `tab-size`, `writing-mode`, `hyphens`, `image-set()` in values, multi-column `column*`, `line-clamp`, `font-feature-settings`, `box-decoration-break`, `text-size-adjust`, `scroll-snap-type`, the inline logical `margin` and `padding` longhands, and the `::placeholder`, `:read-only`, and `:read-write` selectors. Prefixed declarations are emitted ahead of the standard one, so a browser that understands the standard form uses it.

  Flexbox, transforms, transitions, animations, and gradients are left unprefixed, since those browsers need no prefix for them. Declarations you author already prefixed pass through untouched. For a different browser floor or prefix set, declare both forms yourself or write a plugin that emits the prefixes you need. Prefixing applies to web output; see https://styled-components.com/docs/compatibility for the React Native picture.

  Custom plugins authored against the v6 stylis contract need to port to the narrower plugin interface, which exposes `rw` (selector rewrite) and `decl` (declaration rewrite) hooks; implement either or both. A hook may return one result or an array (one authored declaration or selector expands into several).

  ```ts
  import type {
    DeclResult,
    DeclTransform,
    SCPlugin,
    SelectorTransform,
  } from "styled-components/plugins";

  // `rw` is a `SelectorTransform`: runs on every fully-resolved selector after
  // `&` substitution and namespace prepending. Return a new selector string, or
  // an array of selectors to emit one rule per entry.
  const scopePlugin: SCPlugin = {
    name: "scope",
    rw: (selector) => `.app ${selector}`,
  };

  // `decl` is a `DeclTransform`: runs on every emitted `prop: value` pair
  // (top-level decls, decl-body at-rules, keyframe frames). Return a `DeclResult`
  // to rewrite, an array to expand one declaration into several, or `void` to
  // leave the pair unchanged.
  const remToPxPlugin: SCPlugin = {
    name: "rem-to-px",
    decl: (prop, value) => {
      const match = value.match(/^(-?\d*\.?\d+)rem$/);
      return match
        ? { prop, value: `${parseFloat(match[1]) * 16}px` }
        : undefined;
    },
  };
  ```

  Custom plugins compose with the first-party ones left to right: pass `plugins={[prefixPlugin, myPlugin]}` and `myPlugin` runs on every declaration and selector `prefixPlugin` emitted.

  The `name` field is required and identifies the plugin so different plugin sets across nested `<StyleSheetManager>` trees stay isolated. Each plugin is tree-shaken out of any bundle that doesn't import it.

- react-native-web: CSS the browser implements natively reaches it untouched. This covers math functions with units (`calc()`, `min()`, `max()`, `clamp()`, `round()` and friends), viewport units (`dvh` / `svh` / `lvh` stay distinct), standalone `translate` / `rotate` / `scale` (3D values keep their Z component on the web), `transform-style`, `transform-box`, `perspective`, `light-dark()`, CSS system color keywords, wide-gamut color functions with theme values, `hyphens`, `text-wrap`, `caret-color`, `accent-color`, `overscroll-behavior`, `scrollbar-width`, `field-sizing`, `interactivity`, and `direction`. Native-only prop mappings and their platform-limitation warnings are scoped to the native targets and do not appear on the web. ([rn-web-browser-native-passthrough.md](https://github.com/styled-components/styled-components/commits/main/.changeset/rn-web-browser-native-passthrough.md))
- A `<StyleSheetManager>` in a server component styles only the server components rendered inside it. Placing one in a Next.js layout to style every page (as the v6 guidance for `stylisPluginRSC` suggested) has been removed in favor of `configureServerStyles`, a one-line call at the top of the root layout file: ([rsc-layout-manager-reach.md](https://github.com/styled-components/styled-components/commits/main/.changeset/rsc-layout-manager-reach.md))

  ```tsx
  // app/layout.tsx
  import { configureServerStyles } from "styled-components";
  import { rscPlugin } from "styled-components/plugins";

  configureServerStyles({ plugins: [rscPlugin] });
  ```

  If you upgrade from v6 with a layout manager such as `<StyleSheetManager stylisPlugins={[stylisPluginRSC]}>`, move its plugins into `configureServerStyles`; otherwise its plugins stop reaching your pages and `:first-child` / `:nth-child` selectors count the inline style tags again.

- Splitting a block across a value and its template has been removed in favor of writing the whole block in one place. A template that leaves `calc(`, a string, or a bracket open for a value to close is dropped from that point, and development builds warn about it. A paren, string, or bracket that a value opens can close later in the same declaration, as in `width: ${'calc('}1px${')'};`. ([split-block-removed.md](https://github.com/styled-components/styled-components/commits/main/.changeset/split-block-removed.md))
- React Native: `@supports` conditions are evaluated as real feature queries. A condition like `@supports (display: grid)` answers based on what the current platform can actually render, `not` / `and` / `or` combinations follow the CSS grammar (invalid mixes are ignored as the spec requires), unknown future syntax such as `selector(...)` evaluates to false, and on the web the browser answers directly. Probing for an unsupported feature inside `@supports` is silent: the query is the supported way to ask, so it does not emit the development warning for that feature. ([supports-real-feature-queries.md](https://github.com/styled-components/styled-components/commits/main/.changeset/supports-real-feature-queries.md))
- React Native: `z-index: auto` resolves to the platform default stacking (the behavior CSS defines for `auto`) on iOS and Android, and passes through to the browser on the web. ([z-index-auto-native.md](https://github.com/styled-components/styled-components/commits/main/.changeset/z-index-auto-native.md))

### Minor Changes

- Added a second argument to function-form `attrs((props, ast) => ...)` callbacks for bridging styles into props on third-party components. The `ast` accessor exposes `peek` (read a value) and `pop` (read and remove from the rendered style), and accepts either a CSS property name or a typed dot-separated theme path (e.g. `'color.red.500'`). Path autocomplete and value-type inference flow from your augmented theme. ([attrs-ast-bridge.md](https://github.com/styled-components/styled-components/commits/main/.changeset/attrs-ast-bridge.md))

  ```tsx
  import { Path } from "react-native-svg";

  const Icon = styled(Path).attrs((_props, ast) => ({
    fill: ast.pop("color"), // lift CSS decl into a prop
    stroke: ast.peek("palette.brand"), // read from theme via typed path
  }))`
    color: red;
  `;
  ```

  Both methods take an optional fallback as the second argument, returned when the value is missing. A property name may be written in kebab-case (`background-color`) or camelCase (`backgroundColor`, `WebkitTextFillColor`) on both platforms. On the web a custom property (`--tint`) is read by its exact name. On React Native a custom property is readable only by a callback that does not read `props`; a callback that reads `props` gets `undefined`. On React Native a callback that does not read `props` also receives the value as written in the CSS (`'4px'`), while one that reads `props` receives the React Native value (`4`). Supported on the web and React Native, with no per-render overhead when the callback resolves entirely from static declarations.

  The arity-2 callback receives `ast` as a non-optional `CompiledAst`, so you can read it directly without optional-chaining under TypeScript `strict: true`. The arity-1 form (`.attrs((props) => ...)`) takes only `props`.

- Client styles inject through `useInsertionEffect`. ([buffered-injection-default.md](https://github.com/styled-components/styled-components/commits/main/.changeset/buffered-injection-default.md))

  Class names are still resolved during render so elements get the right `class` on the first paint, but the stylesheet write runs in the insertion effect after React commits. Discarded concurrent renders no longer leave rules in the document, and a committed update still gets its rules even when an earlier concurrent attempt for the same styles was discarded. Blocking updates (concurrent features off) behave the same: styles apply on commit, not mid-render.

  `ServerStyleSheet` SSR and React Server Components still flush during render, where insertion effects do not run.

- `configureServerStyles` takes a `namespace`, which every server component is styled under, for the whole server process: ([configure-server-styles-namespace.md](https://github.com/styled-components/styled-components/commits/main/.changeset/configure-server-styles-namespace.md))

  ```tsx
  // app/layout.tsx
  import { configureServerStyles } from "styled-components";

  configureServerStyles({ namespace: "#app" });
  ```

  Both `namespace` and `plugins` are optional, and each call sets both: a call without `namespace` clears it. A `<StyleSheetManager>` inside a server component starts from this namespace; its own `namespace` prop replaces it, and `namespace=""` drops it.

  Client components take their namespace from a `<StyleSheetManager>` rendered on the client, such as the one in your style registry. Give that manager the same `namespace`, so a component rendered on both sides gets the same class.

- `configureServerStyles({ plugins })` sets the plugins every server component is styled with, for the whole server process. Call it once, at the top level of a module every server render loads first. In Next.js that's the root layout file: ([configure-server-styles.md](https://github.com/styled-components/styled-components/commits/main/.changeset/configure-server-styles.md))

  ```tsx
  // app/layout.tsx
  import { configureServerStyles } from "styled-components";
  import { rscPlugin } from "styled-components/plugins";

  configureServerStyles({ plugins: [rscPlugin] });

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    // ...
  }
  ```

  It reaches every server-rendered page and nested layout, including pages prerendered at build time and pages reached by client-side navigation. A `<StyleSheetManager>` inside a server component starts from these plugins; its own `plugins` prop replaces them, and `plugins={[]}` drops them.

  It applies to server components only. Client components take their plugins from a `<StyleSheetManager>` rendered on the client, such as the one in your style registry. Make one call per app: a later call replaces an earlier one and applies to renders that start after it. Next.js `instrumentation.ts` is not a reliable place for it, because Next.js does not run it while prerendering pages at build time.

- Cut the TypeScript cost of using styled components in an app. A render target's props are resolved once per target instead of once per JSX call site, which is where most of the work was going. Against a fixture of 100 styled components the type count drops to roughly a sixth and peak memory to roughly a quarter, putting v7 slightly under v6 on both. ([consumer-type-check-cost.md](https://github.com/styled-components/styled-components/commits/main/.changeset/consumer-type-check-cost.md))
- A declared `style` type now constrains the fields it names and leaves the rest of CSS accepted, instead of replacing the target's `style` outright. Wrap the declaration in the new `CustomStyle` export to forbid everything it omits rather than writing `never` for every property by hand. The constraint holds through `as` and `forwardedAs`. ([declared-style-merges.md](https://github.com/styled-components/styled-components/commits/main/.changeset/declared-style-merges.md))

  Under `exactOptionalPropertyTypes` a component with a declared `style` rejects an explicit `style={undefined}`; declare `style?: X | undefined` to allow it. Omitting the prop is unaffected.

- `createGlobalStyle` rules land before any consumer layout effect. ([global-styles-before-layout-effects.md](https://github.com/styled-components/styled-components/commits/main/.changeset/global-styles-before-layout-effects.md))

  Global styles now write from an insertion effect, which React runs for the whole tree before any layout effect. A component measuring itself in `useLayoutEffect` reads the styled measurement, where before it could read the unstyled one depending on where the global style component sat in the tree.

  If you were compensating for that ordering, for example by measuring in a passive effect or on a later tick, that workaround can come out.

- Smaller bundles: `styled.div` and every other element shorthand is built the first time it is read, so an app ships no table of element names and pays only for the tags it uses. ([lazy-element-shorthands.md](https://github.com/styled-components/styled-components/commits/main/.changeset/lazy-element-shorthands.md))

  `styled.div`, `styled.feBlend` and the rest behave exactly as before, including returning the same component factory on repeated reads, and `'div' in styled` still answers `true`. Two things differ if you inspect `styled` itself: `Object.keys(styled)` no longer lists every tag, and reading a lowercase name that is not a standard element (`styled.blink`) now hands back a working factory rather than `undefined`, matching what `styled('blink')` has always done. CamelCase probes such as `toJSON` stay undefined.

  Published bundles are also emitted as ES2020 rather than ES2015. Every supported peer (React 19, React Native 0.85, Node 16) runs that syntax natively.

- React Native: modern CSS functions are supported in styles. Values that can be calculated immediately are converted before they reach React Native, while values that depend on the device, like viewport size, safe area, container size, or color scheme, update when those inputs change. ([modern-css-polyfills.md](https://github.com/styled-components/styled-components/commits/main/.changeset/modern-css-polyfills.md))

  ```tsx
  import styled from "styled-components/native";

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
  - `oklch(...)`, `oklab(...)`, `lch(...)`, `lab(...)` resolve to a color React Native can render. Wide-gamut inputs that fall outside sRGB are mapped to the closest in-gamut color while preserving hue, so the rendered result stays as close as possible to what was written. `lab()` and `lch()` accept percentage channels and resolve to the correct color (`lab(50% 0 0)` is mid-gray); per CSS Color L4 each space has its own range: `lab` L maps 0%-100% to 0-100 with a/b at ±125, `lch` C maps 100% to 0-150, `oklab` L maps to 0-1 with a/b at ±0.4, and `oklch` C maps 100% to 0-0.4.
  - `round(line-width, A)` snaps `A` to the device pixel grid at render time using the platform's pixel ratio, matching the CSS Values 4 "snap a length as a line width" algorithm. Useful for hairline borders that should align to physical pixels regardless of screen scale.
  - `color-mix(in <space>, …)` mixes through the requested space (`srgb`, `oklab`, `oklch`, `lab`, `lch`) and converts back to sRGB for display.
  - Viewport units `vw` / `vh` / `vmin` / `vmax` / `dvh` / `svh` / `lvh` scale to the current window dimensions.
  - Container query units `cqw` / `cqh` / `cqmin` / `cqmax` scale to the nearest ancestor container.
  - `light-dark(light, dark)` swaps based on OS appearance.
  - `env(safe-area-inset-top | right | bottom | left)` reads the ambient safe-area insets from `react-native-safe-area-context` when that peer is installed and the tree is wrapped in `<SafeAreaProvider>`. To feed insets from another source, wrap a subtree in `SafeAreaInsetsProvider` from `styled-components/native`; the provided value wins over the automatic read and works without the peer. Without any source the names still resolve (to `0`), matching a rectangular display.
  - Logical shorthands `margin-inline`, `margin-block`, `padding-inline`, `padding-block`, `inset-inline`, `inset-block` apply as authored.
  - `line-clamp: N` truncates to N lines.
  - `&:is(:hover, :focus)` and `&:where(:pressed, :disabled)` apply the styles to each listed state.
  - `@media (min-aspect-ratio: 16/9)`, `(max-aspect-ratio: 1/1)`, and exact `(aspect-ratio: 4/3)` match the device's current width-to-height ratio. Bare numbers are treated like `<n>/1`, matching browser behavior.
  - `@starting-style { ... }` declarations apply on first mount: the starting values are the initial state and any transitions on the same component animate from there toward the resolved values.

  The full, current support matrix for CSS on React Native lives at https://styled-components.com/docs/compatibility.

- React Native: `accent-color` is supported on every target. Applied to a `styled.Switch`, it tints the on-state surface so the control picks up the value (the closest analog to the behavior on the web of tinting a checked checkbox). Both `<color>` values and `accent-color: auto` are accepted; `auto` resolves to the platform's accent color. ([native-accent-color.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-accent-color.md))

  The same color forms apply here as in every other color slot in styled-components: HTML named colors, CSS Color 4 system keywords, hex, modern color functions, and theme tokens.

  For wrapping a third-party component (Slider, Checkbox, ProgressBar, etc.) whose tint prop isn't `<Switch>.trackColor`, use the function form of `.attrs(...)` with the AST bridge to forward the resolved value:

  ```tsx
  const ThemedSlider = styled(Slider).attrs<{ thumbTintColor?: string }>(
    (_props, ast) => ({
      thumbTintColor: ast.pop("accentColor"),
    })
  )`
    accent-color: red;
  `;
  ```

  `ast.pop('accentColor')` returns the resolved value and removes it from the style bag so it doesn't reach the wrapped component as an unrecognized style key. Cascade-style inheritance from an ancestor `accent-color` declaration down to a descendant `<Switch>` is not implemented in this release; declare `accent-color` on the Switch itself (or use the attrs recipe above when wrapping).

- Added CSS anchor positioning on React Native (core subset). Declare `anchor-name: --save` on any styled element and position absolutely-placed siblings against it in pure CSS: `top: anchor(--save bottom); left: anchor(--save left); width: anchor-size(--save width);`. Anchored elements track the anchor as it moves or resizes, fallback values apply when the anchor is missing, `position-anchor` supplies an implicit target, and the functions compose inside `calc()`. Supported subset: physical side keywords in `top`/`left` insets, with the anchor and positioned element sharing a parent; unsupported forms fall back with a development warning. On the web the browser handles the same declarations natively. ([native-anchor-positioning.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-anchor-positioning.md))
- React Native: CSS `transition`, `@keyframes`, and `@starting-style` animate. ([native-animation.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-animation.md))

  ```jsx
  const fade = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
  `;

  const Toast = styled.View`
    background-color: ${(p) => p.$bg};
    transition: background-color 280ms ease-out;
    animation: ${fade} 240ms ease-out both;
    @starting-style {
      opacity: 0;
    }
  `;
  ```

  Animation is on by default. No extra import, peer dependency, or configuration. Eligible properties (opacity, every color, all border radius corners, transforms, shadows, filter) run on the native thread for jank-free 60 fps playback. Keyframes drive multi-segment interpolations with per-frame easing, and the full grammar of `animation-direction`, `animation-fill-mode`, `animation-play-state`, and `animation-iteration-count` (integer, fractional, or `infinite`) is supported. Spec-correct color interpolation in oklab keeps mid-transition colors faithful.

  Spec-correct CSS easing: `ease`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier()`, `steps()`, and `linear()` all map to their W3C-spec curves. The CSS `ease` keyword maps to the W3C `ease` curve, not React Native's `Easing.ease` (which is the `ease-in` curve and a common source of subtle visual mismatches in other libraries).

  Comma-separated `animation-composition` pairs each value with the matching `animation-name` entry when you run multiple animations. On react-native-web, parallel animations that use additive composition (`add` or `accumulate`) pass `animation-composition` through to the browser so layered effects compose per CSS Animations Level 2; when every effect uses the default `replace` composition, the cascade is unchanged.

  Multi-argument transform shorthands (`translate(x, y)`, `translate3d(x, y, z)`, and `scale(x, y)`) animate correctly per axis inside `@keyframes` or a `transition`, alongside single-axis forms and uniform `scale(n)`, on iOS, Android, and react-native-web.

  Honors `prefers-reduced-motion`: when the OS setting is on, durations collapse to 0 and animations snap.

  If your app already uses `react-native-reanimated@^4` on Fabric (New Architecture), you can route animations through its UI-thread-compiled CSS layer instead by importing the alternate adapter once at your app entry:

  ```js
  import "styled-components/native/reanimated";
  ```

  Authored CSS animations and keyframes then run on the UI thread: reduced motion collapses CSS-layer durations and delays to zero, and `@starting-style` entry transitions start from the declared starting snapshot. This is purely opt-in; everything above works without it. `react-native-reanimated` is an optional peer dependency and is only required if you take this import.

- React Native: the CSS `attr()` function is supported. Styles can read the component's own props as typed CSS values: `width: attr(data-size px, 48px)` sizes from a `data-size` prop and uses the fallback when the prop is missing or invalid. Supported types include unit names (`px`, `%`, `deg`, ...), `number`, `raw-string`, and `type()` forms for lengths, numbers, percentages, and colors. `attr()` composes inside `calc()`, and fallbacks can themselves be dynamic values like `light-dark()`. ([native-attr-function.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-attr-function.md))
- React Native supports `:not(<simple-selector>)`. Rules such as `:not(:hover)`, `:not(:focus)`, `:not([disabled])`, and `:not([data-state='loading'])` apply when the inner condition does not match. More complex forms, including multiple selectors or nested descendant selectors, are not supported on native: they show a development warning and are ignored. ([native-attr-operators-and-not.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-attr-operators-and-not.md))
- React Native: attribute selectors apply styles based on the rendered element's props. ([native-attribute-selectors.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-attribute-selectors.md))

  ```jsx
  const Toggle = styled.Pressable`
    background: white;
    &[aria-pressed="true"] {
      background: yellow;
    }
  `;

  <Toggle aria-pressed={true} />; // yellow background
  ```

  The same CSS is supported on the web and on React Native. This is especially useful for `aria-*` props, since React Native passes them to platform accessibility services. Presence checks like `&[attr]` match when the prop is defined, and exact matches like `&[attr='value']` compare the rendered prop value as text, so `aria-pressed={true}` and `aria-pressed="true"` both match `[aria-pressed='true']`. Substring, prefix, suffix, word, and case-insensitive matches are supported too.

- React Native: `box-sizing` and `hyphens` are supported. ([native-box-sizing-and-hyphens.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-box-sizing-and-hyphens.md))

  ```tsx
  import styled from "styled-components/native";

  const Card = styled.View`
    box-sizing: border-box;
    padding: 16px;
    border: 1px solid #ccc;
  `;

  const Paragraph = styled.Text`
    hyphens: auto;
  `;
  ```

  `box-sizing: border-box | content-box` flows through unchanged on iOS, Android, and react-native-web.

  `hyphens: none | manual | auto` controls automatic word-breaking. On Android the value drives the system hyphenation frequency. On iOS automatic hyphenation can't be enabled programmatically, so `auto` falls back to manual breaking; embed soft-hyphens (U+00AD) in source text to control break points there. On react-native-web the browser handles it natively.

- React Native: several CSS properties are supported across platforms: `caret-color`, `object-fit`, `backface-visibility`, and `outline-offset`. ([native-caret-color-and-passthroughs.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-caret-color-and-passthroughs.md))

  ```tsx
  import styled from "styled-components/native";

  const SearchField = styled.TextInput`
    caret-color: #00aacc;
    border: 1px solid #ccc;
  `;

  const Avatar = styled.Image`
    object-fit: cover;
    width: 64px;
    height: 64px;
  `;
  ```

  `caret-color: auto | <color>` colors the text-insertion caret. On Android the color is applied to the caret only, leaving selection-range highlight untouched. On iOS the authored color applies to the caret; the platform exposes a single surface for the caret and selection highlight, so the selection picks up the same color as a side-effect and a development warning names the deviation. On react-native-web the browser handles it natively. Pass `selectionColor` directly on `<TextInput>` if an iOS-specific selection tint is needed.

  `object-fit` on a styled Image renders consistently on iOS, Android, and react-native-web. `backface-visibility` and `outline-offset` flow through unchanged on all three targets.

- React Native: `em`, `lh`, and `rlh` length units are supported. Values like `padding: 1em`, `gap: 0.5lh`, and `min(10px, 5em)` resolve against the current text size and line height, so typography-based spacing can be shared across the web and React Native without rewriting everything to pixels. ([native-cascade-em-lh-direction-aware-text-align.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-cascade-em-lh-direction-aware-text-align.md))

  `text-align: start`, `text-align: end`, and `text-align: match-parent` resolve under both left-to-right and right-to-left writing directions on React Native, matching the direction-aware behavior on the web.

  A component's font size, line height and direction reach its descendants from wherever they are set: its CSS (including `@media`, `!important` and `var()`), `attrs`, and the `style` prop as an object, an array or a `Pressable` style function. One text size at the top of a card can drive the relative spacing inside it. A `Pressable`'s `:active` font size and line height reach its descendants while it is pressed. Descendants keep their state when one of these values appears or changes, and memoized descendants re-render only when a value changes. A custom component that wraps `Pressable` passes its resting values only.

- React Native: descendant and child combinator selectors are supported across styled components. ([native-combinator-selectors.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-combinator-selectors.md))

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

  The same selectors are supported on the web. This also fixes a web bug where `${Component} { ... }` rules placed after another declaration could lose the component selector and target too broadly.

- React Native: the `corner-shape` property is supported, at the fidelity each value can actually be drawn. ([native-corner-shape.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-corner-shape.md))

  `round` maps to iOS's circular corner curve, which is React Native's own default, so it renders exactly on every platform. `square` applies a zero radius to the corners it names, since the spec defines `square` as the shape `border-radius: 0` already draws, so it is also exact, and it is the only `corner-shape` value Android renders. Because `square` resolves per corner rather than to the single per-view `borderCurve`, it can be mixed with one curve: `corner-shape: square round` squares the top-left and bottom-right and leaves the other two rounded.

  `squircle` (and nearby `superellipse()` values) maps to Apple's continuous curve, which is an approximation rather than a match. Measured on iOS 26, `continuous` moves the outline by under 1% of the element's side at any radius, roughly an eighth as far as the exponent-4 superellipse the spec asks for, so it looks close to `round`. Android drops `borderCurve` altogether and warns.

  Concave and beveled contours (`bevel`, `notch`, `scoop`, far-out `superellipse()` values) cannot be drawn and drop with a development warning, leaving the initial `round`. Two different curves on different corners also drop, since `borderCurve` applies to the whole view. On the web the value passes through to browsers that support it.

  ```js
  const Card = styled.View`
    border-radius: 16px;
    corner-shape: square round;
  `;
  ```

- React Native supports CSS custom properties through the component cascade. ([native-custom-properties.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-custom-properties.md))

  Declare a property on any styled component (`--brand: tomato;`) and descendants can read it back through the standard `var()` syntax (`color: var(--brand);`). The substitution honors the full CSS Variables Module Level 1 contract: fallbacks (`var(--maybe, default)`), nested resolution (`var(--a, var(--b, default))`), nested resolution in the name argument (`var(var(--name-of-name))`), cycle detection, and case-sensitive names. A substituted shorthand expands to its longhands like authored CSS, so `margin: var(--spacing);` with `--spacing: 4px 8px;` sets the individual margin sides.

  A `var()` reference whose custom property holds a render-dependent value, such as `light-dark(...)`, a viewport unit, or `env(...)`, resolves against the live environment exactly as if the value had been written literally. This applies to inherited and self-declared custom properties, `var()` fallbacks, and `var()` inside `@media` and other conditional blocks, and the resolved value updates in place when the OS theme changes.

  The `@property` rule registers custom properties with a typed syntax, an initial value, and an inheritance switch: an unset registered property resolves `var()` references to its typed initial value, and `inherits: false` registrations stop ancestor values from leaking into descendants. Invalid rules (missing descriptors, initial values that don't match the declared syntax) are ignored with a development warning, matching the spec. On the web, registrations forward to the browser's own `CSS.registerProperty()`.

  Spec compliance touches:

  - `--foo: initial` correctly resets a custom property to the guaranteed-invalid value, so a downstream `var(--foo, fallback)` substitutes the fallback.
  - Trailing `!important` is stripped from custom property values before they reach the cascade.
  - A literal `var(--name)` inside a quoted CSS string (e.g. `content: "var(--brand)"`) is preserved verbatim.
  - Bare `--` declarations are dropped (reserved for future use per the spec) and never leak as a style key.

  The react-native-web bundle leaves both the declarations and `var()` references in place so the browser's own cascade handles them. A development warning fires on a `var()` reference only when no ancestor declared the property and no fallback was provided.

- React Native: `&:disabled` and `&:enabled` work on iOS and Android. Each element follows its own rule for "disabled": `Pressable` and custom components read the `disabled` prop, the Touchables, `Text` and `Switch` also honor the fallbacks React Native itself reads (`aria-disabled` on `TouchableOpacity` and `Text`, `accessibilityState.disabled` on the Touchables, on `Text`, and on `Switch` on Android), and `TextInput` reads `disabled` or `aria-disabled`. A component of your own that shares a React Native name, such as a design system's `Button`, follows the custom-component rule. Props set through `.attrs()` count; a prop that `shouldForwardProp` drops does not. `&:enabled` matches every element that is not disabled, including `View` and `Text`. A `transition` does not animate a change between the two; the values switch at once. On the web, `Pressable`, the Touchables, `Switch`, `Text` and `TextInput` match the same way from `disabled`; an element whose rendered HTML carries `aria-disabled="true"` also matches `&:disabled` (`Pressable` sets that attribute from `disabled`, so it matches only when disabled), and `accessibilityState.disabled` does not. See https://styled-components.com/docs/compatibility. ([native-disabled-enabled.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-disabled-enabled.md))
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

  The field grows in height as the user types, no controlled height state, no `onContentSizeChange` wiring. Pass `multiline={false}` explicitly to keep a fixed single-line field (a development warning points out that autosize is off in that case).

  On react-native-web the declaration is handed straight to the browser, which has supported `field-sizing` natively since Chrome 123.

- React Native: CSS font properties accept the full CSS grammar and produce identical results on iOS, Android, and the web. ([native-fonts.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-fonts.md))

  - `font-size` accepts absolute-size keywords (`xx-small` through `xxx-large`), relative-size keywords (`larger` / `smaller`), absolute lengths (`pt`, `pc`, `in`, `cm`, `mm`, `Q`), font-relative units (`em`, `rem`, `lh`, `rlh` plus the font-metric forms `ex`, `cap`, `ch`, `ic` and their `r`-variants), viewport units, container-query units, and percentages. Absolute-size keywords resolve to 9, 10, 13, 16, 18, 24, 32, 48 (the reference ramp modern browsers use at the default medium of 16px) on every platform. Relative-size keywords resolve at render time against the inherited cascade font-size, stepping to the next entry on the ramp when the inherited size matches a keyword and otherwise multiplying by 1.2. Everything else folds against the current environment at render time.
  - `line-height` accepts the same expanded set: absolute lengths, font-relative units (including font-metric forms), viewport units, container-query units, and percentages all resolve against the cascade. A percentage line height inside the `font` shorthand resolves when the font size is known.
  - `letter-spacing` accepts the full CSS length grammar. Absolute lengths fold to dp at compile time; font-relative, viewport, and container-query units resolve at render time. Numbers, `px`, and `normal` are supported.
  - `font-style: oblique` maps to `italic`; an authored angle triggers a development warning.
  - Generic `font-family` keywords such as `serif`, `sans-serif`, `monospace`, `system-ui`, `ui-rounded`, `emoji`, and `math` map to an appropriate platform font on iOS and Android; react-native-web passes the keyword to the browser. When a font list contains multiple comma-separated families, styled-components uses the first one and shows a development warning because React Native accepts only one font family.

  Font keyword classes that React Native cannot replicate exactly drop with a development warning that names the offending keyword and suggests a concrete alternative:

  - Font-width / font-stretch keywords (`condensed`, `expanded`, etc.) drop because React Native does not control glyph width.
  - System font names (`caption`, `icon`, `menu`, `message-box`, `small-caption`, `status-bar`) drop because the per-platform meaning has no cross-platform mapping; pick a `font-family` explicitly.

  On the web, browser-handled values are kept as authored.

- React Native: a `display: grid` layout subset is supported. A grid container written as `display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;` lays its direct styled children into equal columns, sizing each child to its share of the measured container width. Use `grid-column: span 2` to make a child span multiple columns. ([native-grid-subset.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-grid-subset.md))

  ```tsx
  const Grid = styled.View`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  `;
  const Wide = styled.View`
    grid-column: span 2;
  `;
  ```

  The supported subset is equal `1fr` columns (`repeat(N, 1fr)` or a `1fr 1fr 1fr` track list) plus `gap` / `row-gap` / `column-gap` and `grid-column: span N` on direct children. Anything outside it, including fixed-pixel tracks, `minmax()`, `auto-fill` / `auto-fit`, unequal fractions, and line-number or named-line placement, is ignored with a development warning that names a supported alternative, and the container falls back to a wrapping row. On the web the browser lays out the full grid as written.

  A grid container that also declares `container-type` is a container-query container at the same time: descendants can use `@container` rules and `cq*` units against its measured box.

- React Native supports the `:has(<simple>)` selector. ([native-has-selector.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-has-selector.md))

  ```jsx
  const Card = styled.View`
    padding: 16px;
    &:has(${Icon}) {
      padding-left: 48px;
    }
    &:has([data-state="active"]) {
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

  More complex selectors inside `:has()`, such as descendant chains, sibling selectors, and nested `:has()` calls, are not supported on native.

- React Native supports CSS `!important`. ([native-important-support.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-important-support.md))

  Authoring `color: red !important;` inside a styled component on native behaves like the web:

  - The `!important` marker is stripped from the rendered value, and the declaration applies its color.
  - Important declarations beat any normal declaration on the same property, regardless of source order, including overrides from matched `@media`, `@container`, `@supports`, attribute selectors, pseudo states (`:hover`, `:focus`, `:active`, `:disabled`), `:has()`, `:nth-child()`, and combinator selectors.
  - A shorthand marked `!important` propagates to every longhand (`padding: 4px 8px !important` is important across `padding-top` / `-right` / `-bottom` / `-left`).
  - Importance carries through `var()` substitution and render-time resolvers (`light-dark()`, `env()`, viewport units, theme tokens).
  - Spec-aligned with the web: a styled component's `!important` beats a runtime `style={{ ... }}` prop, while normal declarations stay overridden by the runtime `style` prop.
  - Case-insensitive on the marker (`!IMPORTANT`) and tolerant of whitespace between `!` and `important`.

  `!important` inside `@keyframes` is ignored, matching the CSS Animations spec.

  Cross-component cascade of `!important` for inherited properties (a parent's `!important font-size` defeating a child's normal one) is not supported; coverage is within-component only.

- React Native: `position: sticky` is supported. Direct styled children of a styled ScrollView stick to the top edge and hold position exactly through flings and fast scrolling, with literal declarations and function interpolations alike. On the web the browser handles it. The current support matrix lives at https://styled-components.com/docs/compatibility. ([native-position-sticky.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-position-sticky.md))
- React Native: pseudo-classes chain on iOS and Android, such as `&:active:not(:disabled)` or `&:hover:enabled`. A chained rule applies only when every part matches, and `:not()` of a single pseudo-class inverts it. A chain can start with an attribute or position selector, such as `&[aria-pressed='true']:hover:not(:disabled)`, and `:not()` of an attribute can follow a pseudo-class or an attribute, such as `&:hover:not([data-busy])`. On iOS and Android, `:not()` of an attribute after a position selector (`&:first-child:hover:not([data-busy])`) and `:not()` of a class (`&:hover:not(.icon)`) are skipped with a development warning, since native elements have no class names. In a selector list such as `&:hover, & .icon`, each selector is judged on its own: the supported ones apply and the rest are skipped, with a development warning outside `@media`, `@container` and `@supports`. See https://styled-components.com/docs/compatibility. ([native-pseudo-compounds.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-pseudo-compounds.md))
- React Native: `&:read-only` and `&:read-write` work on iOS and Android. A `TextInput` is `:read-write` while it can be edited: not disabled, not `aria-readonly`, and editable by React Native's own rules (`readOnly` wins over `editable`). A custom component is `:read-write` only when it is not disabled and you pass `readOnly={false}`, or `editable={true}` without `readOnly`. On the web, a `TextInput` given `aria-readonly={false}` stays editable, as on iOS and Android. Every other element is `:read-only`. See https://styled-components.com/docs/compatibility. ([native-read-only-read-write.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-read-only-read-write.md))
- React Native: relative color syntax is supported. You can write values like `oklch(from #f00 calc(l - 0.15) c h)` to derive a new color from a base color, and styled-components renders the result consistently on iOS, Android, and the web. The `oklch()`, `oklab()`, `lch()`, and `lab()` forms are supported, alongside `rgb()`, `hsl()`, `hwb()`, and `color()`. ([native-relative-color.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-relative-color.md))

  The base color can be a literal color, another modern color function, or a theme value such as `oklch(from ${theme.colors.brand} calc(l - 0.15) c h)`. That makes it possible to build lighter, darker, or more transparent variants from one source color without maintaining a separate shade table.

- React Native: CSS scroll-driven animations are supported. `animation-timeline: scroll()` binds any `@keyframes` animation's progress to the scroll position of the nearest styled ScrollView, enabling parallax, scroll progress bars, and reveal-on-scroll in plain CSS. Scrollers can declare named timelines with `scroll-timeline: --name` for descendants to reference, and `animation-range` limits an animation to a slice of the scroll distance (`animation-range: entry 25% 75%`, lengths and `calc()` included). Iteration counts and all four direction modes apply across the scroll range. ([native-scroll-driven-animations.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-scroll-driven-animations.md))

  `animation-timeline: view()` follows the element's own visibility within the nearest styled scroll container: the animation starts as the element scrolls into view and finishes as it scrolls out, with `animation-range` accepting the named view ranges (`cover`, `contain`, `entry`, `exit`, `entry-crossing`, `exit-crossing`) to scope the effect to entering or leaving. Elements using `view()` must be direct children of the scroll container; `view-timeline-inset` is not applied and emits a development warning.

  Opacity and transform keyframes bound to `scroll()` / `view()` track scrolling exactly, so effects like reveals and parallax stay locked to the scroll position. Width, color, and other layout-bound keyframes are not driven this way, since React Native cannot animate those off the JavaScript thread.

  The same declarations are supported on the web.

- React Native: CSS scroll snap is supported on `styled.ScrollView`. Declare `scroll-snap-type` on the scroller and `scroll-snap-align: start | center | end` on its children, exactly like the web: the children become real snap positions (mixed sizes welcome), and `scroll-snap-stop: always` on a child keeps a fast fling from skipping past it. A settle guarantee makes `mandatory` literal on Android, where the platform engine can otherwise leave a caught scroller resting between snap points. ([native-scroll-snap.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-scroll-snap.md))

  Without aligned children, `mandatory` approximates with full-scrollport paging and a development warning; for manual control pass `snapToInterval` or `snapToOffsets` on the ScrollView and your props win. `proximity` applies fast deceleration only. On the web the browser handles all of these properties directly.

- React Native: CSS `overscroll-behavior` and `scrollbar-width` are supported. Apply them to a `styled.ScrollView`, `styled.FlatList`, `styled.SectionList`, or `styled.VirtualizedList`: ([native-scroll-surfaces.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-scroll-surfaces.md))

  - `overscroll-behavior: contain | none` disables both bounce on iOS and the over-scroll glow on Android. `overscroll-behavior: auto` (the initial value) restores the platform defaults.
  - `scrollbar-width: none` hides both scroll indicators; `auto` and `thin` keep the platform default (React Native does not expose a thin-scrollbar surface). `thin` is equivalent to `auto` on native per the spec note that user agents may disregard `thin`.

  Web builds continue to forward the declaration so the browser handles it natively.

- React Native: styled scrollers (`styled.ScrollView`, `styled.FlatList`, and friends) nest like the web. A vertical scroller inside another vertical scrollable receives gestures on Android without passing `nestedScrollEnabled` yourself; iOS and the web behave this way too. Passing the prop explicitly still wins. ([native-scroller-ergonomics.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-scroller-ergonomics.md))

  Declared scroller dimensions hold. React Native's ScrollView stretches and shrinks with its flex parent by default, so `height: 280px` on a styled scroller could render taller or shorter than written. A styled scroller defaults to `flex-shrink: 0`, matching `styled.View`, so an explicit `width` or `height` declaration pins reliably even in a flex parent, matching how CSS sizes a scroll container on the web. Scrollers without a declared dimension keep the fill-parent behavior, and declaring any flex property yourself (including `flex-shrink: 1`) takes precedence.

- React Native: sibling combinator selectors and the `:nth-child` family are supported. ([native-sibling-and-nth-child.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-sibling-and-nth-child.md))

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

  - Adjacent sibling: `${Component} + &`, which applies when the sibling element right before it is the referenced component.
  - General sibling: `${Component} ~ &`, which applies when any earlier sibling element is the referenced component.
  - `:first-child`, `:last-child`, `:only-child`.
  - `:nth-child(N)`, `:nth-child(an+b)`, `:nth-child(odd)`, `:nth-child(even)`.
  - `:nth-last-child(...)` (same syntax as `:nth-child`, counting from the end).
  - `:first-of-type`, `:last-of-type`, `:only-of-type`, `:nth-of-type(...)`, and `:nth-last-of-type(...)`, which count siblings of the same element type, styled or not (a plain `View` and a `styled.View` are one type).
  - `:nth-child(an+b of S)` and `:nth-last-child(an+b of S)`: the formula counts position within the filter, so `:nth-child(2n+1 of [data-active])` selects every odd active sibling regardless of inactive siblings between them. The `of S` inner accepts a styled component reference or a single attribute selector (the same simple-selector forms `:has()` accepts on native); complex inner selectors with combinators or descendant chains warn and fall through.

  These selectors follow the component's JSX position among its sibling elements, and regular React Native components count as siblings, as every element does in a browser: in `<Card /><View /><Divider />`, `${Card} + &` does not apply to `Divider`. Text, `null` and booleans are not counted, arrays and Fragments are counted through, and anything else (a regular component whatever it renders, a `Suspense` boundary, a portal, a generator) counts as one element. A styled component nested inside its own kind gives its children their own positions. `background-blend-mode` layers never count as children. A styled child keeps its position, its styles and its press handling inside a component that clones its only child, such as `TouchableHighlight`, `TouchableWithoutFeedback`, `TouchableNativeFeedback` or a sticky `ScrollView` header.

  A regular sibling keeps its state when a styled sibling appears before it or leaves, so a focused `TextInput` stays focused when an error label mounts beside it.

  Position-dependent styles (`:nth-child`, sibling combinators) re-evaluate when a sibling insertion, removal, or reorder shifts an element's position, even when its own props are unchanged. An `:nth-child(2)` highlight, for example, follows the element that actually sits in the second slot.

- React Native `style` props are checked against React Native's own style types. The CSS-custom-property widening the web entry applies was reaching the native entry too, so web-only CSS and custom properties were accepted on native components that cannot render them. ([native-style-typing.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-style-typing.md))
- React Native: system color keywords such as `Canvas`, `CanvasText`, `Field`, `FieldText`, `GrayText`, `Highlight`, and `LinkText` are supported when used alone or inside composite declarations such as `border`, `outline`, `background`, `text-decoration`, `text-shadow`, `box-shadow`, `filter` / `drop-shadow()`, multi-value `border-color`, and two-token `caret-color` values. Values like `color: CanvasText` and `background-color: Canvas` adapt to the user's appearance and platform color settings where React Native exposes them, with readable fallbacks for unsupported native semantics. On the web the browser handles these keywords directly. ([native-system-colors.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-system-colors.md))

  Keywords match regardless of casing.

- CSS `text-overflow: ellipsis | clip` is supported on every target. Pair it with `line-clamp` or `text-wrap: nowrap` so the content can actually overflow. ([native-text-overflow-and-direction-mirror.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-text-overflow-and-direction-mirror.md))

  `direction: ltr | rtl | inherit` follows the cascade through bidi-aware text on every target without having to set a second prop.

  `outline` declarations that include the `hidden` keyword, like `outline: 2px hidden red`, are not supported and drop with a development warning, since `hidden` is not a legal outline style per the CSS UI spec. Use `outline: none` to remove an outline.

- Multi-shadow `text-shadow` lists are supported. React Native renders a single shadow per Text element, so on iOS and Android the first (topmost) shadow in the list is applied and a development warning suggests stacking duplicate Text elements for more layers. On the web the browser renders the full list as written. ([native-text-shadow-multiple.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-text-shadow-multiple.md))
- React Native: a styled `TextInput` accepts `disabled`. With `disabled` (or `aria-disabled`), the input cannot be edited or focused and is announced as disabled, whatever `editable`, `readOnly` or `tabIndex` say, and it matches `&:disabled`. The prop is typed on `styled.TextInput` and `styled(TextInput)` from `styled-components/native`. ([native-textinput-disabled.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-textinput-disabled.md))
- React Native: the CSS tree-counting functions `sibling-index()` and `sibling-count()` are supported. Styles can size, tint, or position each child by where it sits among its siblings, with one shared ruleset: `width: calc(sibling-index() * 10px)` renders a staircase, `width: calc(100% / sibling-count())` divides a row evenly. Values update automatically when siblings mount, unmount, or reorder. ([native-tree-counting-functions.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-tree-counting-functions.md))

  `calc()` carrying `sibling-index()` or `sibling-count()` also resolves in purely percent-scaled expressions (`width: calc(sibling-index() * 13%)` resolves as a percentage of the parent) and in dynamic math inside a color channel (`oklch(0.72 0.14 calc(sibling-index() * 55))`, or a `sibling-index()` weight inside `color-mix()`, resolves to a displayable color). Mixed percent-plus-length math is not supported and resolves to absolute pixels.

- `styled-components/native` ships a smaller, browser-native build for react-native-web consumers. Webpack, Vite, and Metro (when targeting web) pick it up automatically; existing imports and props are unchanged. ([native-web-bundle.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-web-bundle.md))

  On the web, the browser handles CSS directly, so these features resolve through native browser support:

  - `var()`, `@media`, `@container`, and pseudo-classes (`:hover`, `:focus`, `:nth-child(...)`, `:has(...)`) resolve without React re-renders.
  - `light-dark()` and `prefers-color-scheme` repaint without a React re-render. The document opts into `color-scheme: light dark` automatically so `useColorScheme()` reflects the OS preference.
  - `dvh` / `svh` / `lvh` and the inline / block-axis viewport units (`vi`, `vb`) resolve distinctly per CSS Values 4.
  - `oklch`, `oklab`, `lch`, `lab`, and `color-mix()` render in the browser's full wide gamut (Display P3 / Rec. 2020 where the monitor supports it).
  - Static-mixed-unit `calc()` / `clamp()` / `min()` / `max()` resolve against the real containing block at paint time.
  - `ThemeProvider` and `createTheme` tokens publish as scoped CSS custom properties, so theme changes restyle without re-rendering the subtree.

  A theme variable joined to a unit (`${t.space.sm}px`) reads as a length everywhere on the web, including inside `@media`, nested rules, keyframes, global styles, and under a `StyleSheetManager` with a `namespace` or `plugins`. A `:not()` chain of plain selectors (such as `&:not([data-on])`) on the component's own element weighs nothing in the cascade, so source order decides against an attribute rule, including inside `@media`, under a namespace and in each part of a comma list; global styles keep standard CSS weight.

  Lengths follow standard CSS: a unitless number or a math function on plain numbers (`width: abs(-4)`) is not a length, and the browser drops it. Write the unit (`abs(-4px)`).

  The bundle is smaller because the CSS polyfills for iOS / Android are excluded. iOS and Android consumers are unaffected and continue to use the native CSS engine.

  Consumers who want the same bundle without relying on bundler resolution can import it directly: `styled-components/native/web-bridge`.

- styled-components does no work in a passive or layout effect on its render path. ([no-passive-or-layout-effects.md](https://github.com/styled-components/styled-components/commits/main/.changeset/no-passive-or-layout-effects.md))

  This is a correctness and predictability guarantee rather than a speed one. Where the library needs a lifecycle hook it uses the narrowest thing that fits: a ref callback for teardown that needs a committed host, `useSyncExternalStore` for external mutable state, and `useInsertionEffect` for stylesheet writes.

  On React Native several teardowns now run before paint instead of after, so a sibling reading a scroll-snap or anchor registry never paints a frame against a stale entry. The render-count effect is small and was measured rather than assumed: `position: sticky` elements render once per layout change instead of twice. Scrolling itself is unchanged, and no timing benchmark was run.

  On React Native, `anchor-name` and `scroll-snap-align` now require the styled target to forward its `ref`, because the library registers and deregisters through a ref callback. `styled.View` and every other host target already do. `styled(YourComponent)` needs `YourComponent` to pass `ref` down to the host element it renders; if it does not, the declaration is inert and says so in development rather than stranding an entry nothing can remove.

  Three carve-outs remain, each documented at its site, so this is a guarantee about the library's own render path rather than an absolute: the `position: sticky` overlay publish and its paired deregistration, the reanimated `@starting-style` two-pass flip, and the default Animated adapter's unmount teardown, which is on the path of every animated native component.

- Polymorphic `as`-target attribute autocompletion now works in editors. Typing `<StyledComponent as="video" ` and then a partial attribute name surfaces that target's attributes (`loop`, `muted`, `controls`, `poster`, ...), including while the attribute name is still being typed. Plain usage keeps completing the component's own props, and `forwardedAs` targeting is unchanged. Runtime behavior is identical. ([polymorphic-as-target-autocomplete.md](https://github.com/styled-components/styled-components/commits/main/.changeset/polymorphic-as-target-autocomplete.md))
- Added a `StyledComponent<Target, Props>` type for annotating explicitly-typed styled component exports. ([public-styled-component-annotation.md](https://github.com/styled-components/styled-components/commits/main/.changeset/public-styled-component-annotation.md))

  Packages that emit their own declaration files, including any project using `isolatedDeclarations`, must annotate every exported styled component, and there was no public type for it: consumers reached into internal paths or hand-assembled one that dropped members like a wrapped component's hoisted statics.

  `StyledComponent` is exported from the web and native entries. Name the target and props as you passed them to `styled`:

  ```tsx
  import styled, { type StyledComponent } from "styled-components";

  export const Card: StyledComponent<
    "div",
    { $active?: boolean }
  > = styled.div<{
    $active?: boolean;
  }>`...`;
  export const CloseButton: StyledComponent<typeof IconButton> = styled(
    IconButton
  )`...`;
  ```

  It resolves to the exact type `styled(Target)<Props>` produces, so the annotation is not lossy.

- Performance improvements across the board in v7. Component creation, SSR `renderToString`, and React Server Components rendering are all faster than v6, with SSR seeing the largest gains at scale. Template-literal work is done up front when the styled component is defined, so each render pays less. ([v7-perf-numbers.md](https://github.com/styled-components/styled-components/commits/main/.changeset/v7-perf-numbers.md))
- View transition styles can target a styled component directly. A component that sets `view-transition-name` gets its own class as `view-transition-class`, so a rule in `createGlobalStyle` can name the component inside a view transition pseudo-element: ([view-transition-class.md](https://github.com/styled-components/styled-components/commits/main/.changeset/view-transition-class.md))

  ```tsx
  const Card = styled.li`
    view-transition-name: match-element;
  `;

  const Transitions = createGlobalStyle`
    ::view-transition-group(*${Card}) {
      animation-duration: 400ms;
    }
  `;
  ```

  The class follows a name set on the component's own element in any state or media condition, not one set on a descendant. A `view-transition-class` written in a component's styles is kept as written. An extension of `Card` matches the rules written for `Card`. One that sets its own `view-transition-name` also matches its own rules, and gets the automatic class unless it writes a `view-transition-class` too.

  `view-transition-class: ${Card}` and `container-name: ${Card}` emit the component's class name, which browsers accept, so a component can be listed beside other names. An extension that sets its own `container-type` keeps matching `@container ${Base}` queries, unless it writes its own `container-name`. On React Native, including React Native for Web, an extension's container answers only queries that name the extension itself; see https://styled-components.com/docs/compatibility.

  CSS snapshots of components that set `view-transition-name` include the added `view-transition-class` declaration.

### Patch Changes

- An escaped `&` and a `&` inside a string stay as written in a selector, so `&.\[\&\>\*\]` and `&[title="a & b"]` match what they say. A selector whose only `&` is one of these is scoped under the component, as in `[title="a & b"] { color: red; }`. ([ampersand-in-strings-and-escapes.md](https://github.com/styled-components/styled-components/commits/main/.changeset/ampersand-in-strings-and-escapes.md))
- Renaming `anchor-name` on React Native releases the old anchor. ([anchor-name-rename-releases-old-rect.md](https://github.com/styled-components/styled-components/commits/main/.changeset/anchor-name-rename-releases-old-rect.md))

  The old name's rect stayed in the registry until the element unmounted, so `anchor()` and `anchor-size()` consumers resolving it kept reading a position nothing updated. The rect is now released when the name changes, as documented.

- Fixed a TypeScript regression where `styled(SomeComponent).attrs({...})` could trigger `TS2590: Expression produces a union type that is too complex to represent` on components with deeply-discriminated prop unions, notably antd's `Button`. Affected projects also see modestly faster type-checks; projects without complex unions see no measurable difference. ([attrs-type-perf.md](https://github.com/styled-components/styled-components/commits/main/.changeset/attrs-type-perf.md))
- Fixed `attrs` not applying its value when a prop was explicitly passed as `undefined`. `styled.button.attrs({ type: 'button' })` now renders `type="button"` for `<Button type={undefined} />`, including through a wrapper component that spreads its own props over the styled component. `attrs` always wins for the keys it returns, on web and React Native. ([attrs-win-over-undefined.md](https://github.com/styled-components/styled-components/commits/main/.changeset/attrs-win-over-undefined.md))

  Also fixed: a prop passed explicitly as `undefined` (and not set by `attrs`) is now forwarded to a wrapped component so that component can fall back to its own default, the pattern MUI's `ButtonBase` relies on (for example `<Root role="button" {...props} />`). A DOM tag such as `styled.div` still drops the prop, since browsers have no "undefined" attribute. A component that checks `'role' in props` may see the key where it did not before.

  To let a caller's `undefined` clear an `attrs` default, use the function form and check for the prop:

  ```js
  styled.a.attrs((props) => ("rel" in props ? {} : { rel: "noopener" }))``;
  ```

  `rel={undefined}` then renders no `rel`, and omitting the prop renders `rel="noopener"`.

- Malformed CSS stays inside the statement that holds it, so a typo or an interpolated value cannot consume or inject other rules in the stylesheet. ([brackets-and-multiline-strings-contained.md](https://github.com/styled-components/styled-components/commits/main/.changeset/brackets-and-multiline-strings-contained.md))

  A statement a browser would read past its own end is dropped, along with everything after it in the template, and development builds log a warning naming it. These are:

  - a `[` that never closes, as in `&[data-open { color: red; }`
  - a closer inside a block it cannot close, as in `f({)` or `[)`
  - a paren that never closes straight after an at-rule name, as in `@media(min-width: 1px {`
  - a `/*` a browser reads as an open comment, as in `top: //*;`
  - text ending in an unpaired backslash
  - a string with a raw line break in it, which browsers end at the line break
  - a backslash after unescaped whitespace in an unquoted url, as in `url(a \))`, which browsers already reject

  An interpolated value that leaves one of these open loses only the statement holding it and keeps what follows it in the template, as in `p: q; ${value} r: s;`.

  A complete bracket is one value, matching browsers, so `--areas: [a;b]; color: red;` keeps both declarations. A selector value holding a comma, as in `${'.b, .c'} { top: 0; }`, scopes each selector in it. An at-rule whose name cannot start an identifier, such as a bare `@`, is dropped, matching browsers.

  A string continued with a backslash before a line break is unaffected in a template. In an interpolated value, a backslash before a CR LF line break drops the string.

  A function whose name holds a backslash escape, as in `\75 rl(...)`, might mean `url(`, which reads its contents differently. It works as written when it holds a plain value or a single quoted string. Any other quote, a bracket, a comment, or a nested paren or brace drops it, which in rare cases is stricter than a browser. The same applies to `url(` straight after `&`, as in `&url(...)`, because `&` is part of the name only in a selector.

- A server component's styles, `keyframes` templates included, can hold a `'use client'` export, or a value a server action received from the client, without the render throwing or a selector matching more than written. The server cannot read either one, so the part of the styles holding it is left out: one selector in a list (the whole rule when it was the only one), an at-rule, a keyframes stop, or a declaration. Every other rule still applies. In development a warning names the `'use client'` export, or its module for a default export. ([client-references-in-server-styles.md](https://github.com/styled-components/styled-components/commits/main/.changeset/client-references-in-server-styles.md))

  ```tsx
  // Card.tsx starts with 'use client'
  import { Card } from "./Card";

  const List = styled.ul`
    ${Card} + ${Card} {
      margin-top: 8px;
    }
  `;
  ```

  Here the rule for `${Card}` is left out on the server. To select `Card` from a server component, define the styled component in a module without `'use client'`. A `view-transition-class` or `container-name` left out this way keeps the class the component gets automatically.

- Comments, unclosed parentheses, and unclosed strings stay contained in the statement that holds them. ([comments-and-open-parens-contained.md](https://github.com/styled-components/styled-components/commits/main/.changeset/comments-and-open-parens-contained.md))

  A CSS comment is removed wherever it appears, including inside a function call (`calc(1px /* ) */ + 2px)`) and after an escaped parenthesis in a selector (`&.a\(b`). Inside a function call it leaves a space, so `rgb(0/**/51/**/255)` reads as three numbers. An unquoted `url(x/*.png)` keeps its path, because a comment cannot start inside one, and a quote inside an unquoted `url(` opens no string, matching how browsers read it.

  A statement with a `(` or a quote that never closes is dropped, along with everything after it in the template. A typo such as `width: calc(1px; color: red;` removes those styles from its own component and cannot consume the rules of other components in the stylesheet, and development builds log a warning naming the statement. An interpolated value that leaves one open loses only the statement holding it, so `width: ${'calc(1px'}; color: red;` keeps `color: red`.

  `createGlobalStyle` keeps all of its rules when an interpolated value holds a `;`.

- An interpolated value, or a value in a style object, holds `property: value;` declarations or whole `selector { ... }` rules, and it stays inside the block it was written in, in components and in `createGlobalStyle`, including in templates that contain comments. ([component-scope-escape.md](https://github.com/styled-components/styled-components/commits/main/.changeset/component-scope-escape.md))

  A statement holding a `}` the value did not open, a `{` it never closes, or a string, paren, or bracket still open at the end of the statement is dropped along with the rest of the value, and development builds warn about it, so a value like `red; } body { background: red }` cannot add a rule outside its block. A value like that in a selector or an at-rule condition drops the whole rule and warns in development, and so does one holding a `;` or a block there, as in `@media ${'screen;'} and (min-width: 1px) { ... }`. A value that opens a selector and ends on a `;` or a `}` is read on its own ahead of the rule, so `${mixin} &:hover { ... }` keeps working when the mixin ends in `;`.

  At-rules that state something for the whole page, such as `@font-face`, still apply at the top level when a value holds them.

  A rule whose selector or condition does not read as one once it is joined to its parent or rewritten by a plugin is dropped, and development builds warn about it. So is a rule holding text the library reserves for server rendering. A nested selector that would compose to an extremely long selector is dropped too, since a value nesting many selector lists could otherwise use it to stall rendering.

  A plugin that rewrites a declaration into one holding a brace or a comment, or leaving a string, paren, or bracket open, loses that declaration, and development builds warn about it. With the `rtl` plugin, a four-value shorthand holding a string or an escape keeps its order, and one written across several lines flips the same as one written on a single line.

  In React Server Components, extending a component leaves the text of a `url()` as written, and a selector with a very long run of `+` combinators is adjusted for inline style tags only up to a limit.

  When a text value nests blocks thousands of levels deep, the over-deep block is dropped and the rest of the component's styles apply.

  Templates with a very large number of comments are processed in time proportional to their length.

- An interpolation at the start of a statement is read the way the CSS around it reads: ([component-selector-before-type.md](https://github.com/styled-components/styled-components/commits/main/.changeset/component-selector-before-type.md))

  - A component keeps its place in a selector. `${Child} h2 { ... }`, `${A}, ${B} { ... }`, `${A} ${B} { ... }`, and `${Child} /* note */ { ... }` all target the component, including when a function returns it.
  - A value holding an at-rule opens that at-rule, as in `${media.tablet} { ... }`.
  - A value holding a selector list scopes every selector in it, as in `${'h1, h2'} { ... }`.
  - A value holding a selector stays part of the selector after it, as in `${'h2'} .x { ... }` and `${'a:hover'} .x { ... }`. A value spaced like a declaration applies as one before a name, class, or id, as in `${'color: red'} .x { ... }`. End it with `;` to apply it before `&` or `:` too.
  - `0` and `NaN` hold nothing when a space and a selector follow them, or as a whole item in a selector list, so `${count && mixin} h1 { ... }` and `${count && mixin}, h2 { ... }` skip the value when `count` is 0. Before `&`, `:`, or a combinator they stay in the selector, so write `${count ? mixin : ''}` there.
  - A value holding an at-rule stays one rule when a list or words up to a `(` follow it, as in `${'@media screen'} and (min-width: 40em) { ... }`, and otherwise reads as its own statement, as in `${"@import url('x.css')"} body { ... }`.
  - A value with no space after its colon cannot be told from `a:hover`. It applies as a declaration before a type selector or a component, as in `${'color:red'} h1 { ... }`, and reads as a selector before a class, id, attribute, or `*`, as in `${'a:hover'} .x { ... }`. End a mixin with `;` to apply it everywhere, since babel-plugin-styled-components removes the space from a `css` mixin. Write `a:hover h1` as one value to read it as a selector everywhere.
  - A value holding a comment before a rule applies as statements, so write a selector value with no comment in it.
  - A mixin that follows a comment applies its styles.
  - A selector written against a component stays part of it, as in `${Child}.x { ... }`.
  - A selector list whose values all come out empty, as in `${a && '&:hover'}, ${b && '&:focus'} { ... }` with both falsy, writes nothing.

  An interpolation inside a string or `url()` is substituted as text, as in `content: "a;${x}"`.

  In `createGlobalStyle`, a mixin with no `;` before a class selector keeps the rest of the global style.

  On React Native, a combinator selector, `:nth-child(... of ...)`, an attribute selector's case flag, and an `@container` name can be written with a newline or tab between their parts. See https://styled-components.com/docs/compatibility for the selectors React Native supports.

- `@view-transition` and `@position-try` rules are emitted as written, in components and in `createGlobalStyle`, including inside `@media`. The margin boxes inside `@page` (such as `@top-left`) and the feature value blocks inside `@font-feature-values` (such as `@styleset`) are kept with their declarations. ([declaration-block-at-rules.md](https://github.com/styled-components/styled-components/commits/main/.changeset/declaration-block-at-rules.md))
- Fix a styled component silently dropping props declared as a union whose members have no prop in common, which left every one of those props rejected. Where every member's props are optional the union is still flattened, so declare the combined optional shape instead. ([disjoint-union-props.md](https://github.com/styled-components/styled-components/commits/main/.changeset/disjoint-union-props.md))
- Server rendering on the edge runtime is not supported. On a route with `export const runtime = 'edge'`, a server component using styled-components fails `next build`, and a client component rendered through a `ServerStyleSheet` registry fails on the request, each with an error naming the fix: remove that line, or set it to `'nodejs'`, on every route that renders styled-components on the server. ([edge-runtime-error.md](https://github.com/styled-components/styled-components/commits/main/.changeset/edge-runtime-error.md))
- Empty CSS custom property values are preserved. ([empty-custom-property-values.md](https://github.com/styled-components/styled-components/commits/main/.changeset/empty-custom-property-values.md))

  `--my-prop: ;` is a legitimate CSS declaration; the empty value is part of the Custom Properties spec and is used by patterns like scroll-driven animations as a "guaranteed-invalid" sentinel. It renders as authored:

  ```css
  @keyframes shadow-toggle {
    from,
    to {
      --shadow: ;
    }
  }
  ```

  Empty values for non-custom properties (e.g. `color: ;`) are dropped, since those are invalid CSS.

  Note: components that author `--prop: ;` get a new class name on upgrade since the emitted CSS includes the declaration. Typical apps are unaffected.

- A development-only warning fires when a `css` fragment that carries its own declarations or rules is interpolated right after a declaration that is missing its trailing `;`: ([fragment-missing-semicolon-warning.md](https://github.com/styled-components/styled-components/commits/main/.changeset/fragment-missing-semicolon-warning.md))

  ```jsx
  const Box = styled.div`
    margin: 0 ${10}px ${css`
        color: red;`};
  `;
  ```

  Without the `;`, the fragment text is read as part of the `margin` value, which is not valid CSS. The warning names the spot and asks for a `;` before the `${...}` interpolation. Value-position fragments (`border: ${frag};`) interpolate into the value as usual and do not warn.

- Fix native Node.js ESM default imports so `import styled from 'styled-components'` exposes the styled factory directly. ([fresh-node-default-import.md](https://github.com/styled-components/styled-components/commits/main/.changeset/fresh-node-default-import.md))
- A component keeps its other styles when an interpolation holds one of these values: ([function-interpolation-any-arity.md](https://github.com/styled-components/styled-components/commits/main/.changeset/function-interpolation-any-arity.md))

  - A function declaring two or more parameters, such as `(props, unused) => props.color`. It is called with the render context.
  - An array, directly or returned by a function. Its items are joined as text.
  - `true`, directly or returned by a function. It adds nothing.
  - An object with its own `toString`, such as a class instance or a `Date`, or a `bigint`, directly or returned by a function. It reads as its text.

- Fix TypeScript errors in projects that augment React HTML props with a `data-*` template-literal index signature. ([fuzzy-ravens-smile.md](https://github.com/styled-components/styled-components/commits/main/.changeset/fuzzy-ravens-smile.md))
- Each `createGlobalStyle` applies its own CSS when two global styles differ only in what their functions return, including bodies that are only a function (`` createGlobalStyle`${() => 'html { --a: 1; }'}`  ``) and functions inside a nested `css` helper. This is how a CSS reset and a color-mode style are often written together, for example xstyled's Preflight and ColorModeProvider. When both set the same property, the one mounted most recently wins, and a prop or theme update does not change which one that is. ([global-style-function-id.md](https://github.com/styled-components/styled-components/commits/main/.changeset/global-style-function-id.md))

  When several mounts of one dynamic global style render on the server, the collected styles include every one of them, not only the last.

  A global style whose only function sits inside a nested `css` helper renders its CSS and updates when its props change. Unmounting one of two identical static global styles keeps their CSS in place.

- `createGlobalStyle` interpolations run during render, the same as interpolations on a styled component. They can call hooks such as `useContext`, `useState`, `useSyncExternalStore`, and `use`, and the global style follows what those hooks return without a prop or theme change. ([global-style-interpolations-in-render.md](https://github.com/styled-components/styled-components/commits/main/.changeset/global-style-interpolations-in-render.md))

  A function inside a style object counts too, as in `${{ body: { color: p => p.theme.fg } }}`, and follows the theme and any hook it calls.

  A parent re-render with equal props skips the interpolations. A render on a server with no `ServerStyleSheet` also skips them, since nothing collects the result. In a server component, an interpolation can call only the hooks React offers there.

- Styled components report the same debug value to React DevTools on every render. The value was reported only on renders that recomputed styles, so it disappeared from the DevTools panel whenever a component re-rendered with unchanged style props. ([hooks-cache-hit-debug-value.md](https://github.com/styled-components/styled-components/commits/main/.changeset/hooks-cache-hit-debug-value.md))
- In development, a console warning now appears when the browser finds server-rendered styles from a different styled-components version than the one running. Those styles were previously skipped without notice, which left class names stale and hydration mismatched. Make sure the server and the browser load the same version (`npm ls styled-components` lists duplicates). ([hydration-version-mismatch-warning.md](https://github.com/styled-components/styled-components/commits/main/.changeset/hydration-version-mismatch-warning.md))
- The prop-filtering logic that decides which props reach the underlying DOM element ships inside styled-components, with no `@emotion/is-prop-valid` dependency. Consumers get a smaller dependency tree and a slightly smaller installed footprint, with identical filtering behavior. ([inline-prop-validator.md](https://github.com/styled-components/styled-components/commits/main/.changeset/inline-prop-validator.md))

  Importing `isPropValid` from `@emotion/is-prop-valid` directly elsewhere in your app still works; this only affects what styled-components itself depends on.

- Fixed a crash ("Rendered fewer hooks than expected") and a related stale-style bug for components that call a React hook, or read any value outside their props and theme, from inside a style interpolation. This affected `@mui/styled-engine-sc` with MUI X DataGrid, which calls a hook within an interpolation. ([interpolations-run-every-render.md](https://github.com/styled-components/styled-components/commits/main/.changeset/interpolations-run-every-render.md))

  Style interpolations and `attrs` now run on every render, on the web and on React Native, so a hook called inside one runs consistently and a value read inside one is current as of that render. A re-render with unchanged props is still skipped.

- Nested rules resolve correctly when their parent selector contains a comma inside `:is()`, `:where()`, `:has()`, or an attribute selector: ([is-where-cross-product-bug.md](https://github.com/styled-components/styled-components/commits/main/.changeset/is-where-cross-product-bug.md))

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

  The grandchild rule compiles to `:is(.card-class:hover, .parent:hover .card-class) .child .grandchild { color: blue; }`, keeping the `:is()` arms intact. Commas inside `[attr*="a,b"]` and other paren- or bracket-protected contexts resolve the same way.

- A function interpolated into `keyframes`, directly or as a value in a style object, is left out of the animation, and in development a warning says so. Keyframes are built once where they are defined, so there are no props or theme to call a function with. ([keyframes-function-interpolation.md](https://github.com/styled-components/styled-components/commits/main/.changeset/keyframes-function-interpolation.md))

  ```tsx
  const fade = keyframes`
    from { opacity: 1; }
    to { opacity: ${() => 0.2}; } /* left out, with a warning */
  `;
  ```

  For a theme value, interpolate the `createTheme` value. It follows the active theme, and one animation serves every theme:

  ```tsx
  const theme = createTheme({ opacity: { dim: 0.2 } });

  const fade = keyframes`
    from { opacity: 1; }
    to { opacity: ${theme.opacity.dim}; }
  `;
  ```

  For any other value, interpolate the value itself (`${0.2}`), or build the keyframes inside the function that has the value.

- On react-native-web, `onAnimationEnd` and `onTransitionEnd` on a styled React Native primitive run when that element's CSS animation or transition finishes. They run on primitives whose ref is the DOM element, including `View` and `Text`, and on `FlatList`, `SectionList`, and `VirtualizedList`. They do not run on `KeyboardAvoidingView`; put the callback on a styled `View` inside it. ([long-cameras-fail.md](https://github.com/styled-components/styled-components/commits/main/.changeset/long-cameras-fail.md))

  The callback receives `{ animationName, elapsedTime }` or `{ propertyName, elapsedTime }`, the same as on iOS and Android. `elapsedTime` is in seconds and does not include `animation-delay` or `transition-delay`. `propertyName` is the camelCase style name, so a transition on `background-color` is reported as `backgroundColor`. A completion on a child does not call the parent's callback, and a completion on a pseudo-element does not call it either.

- Under a `StyleSheetManager` `namespace`, selectors that start at the document root apply when the namespace element is `<html>`. With `namespace="#app"` on `<html id="app">`: ([namespace-root-selectors.md](https://github.com/styled-components/styled-components/commits/main/.changeset/namespace-root-selectors.md))

  ```tsx
  const Card = styled.div`
    html.dark & {
      color: white;
    }
  `;

  const Transitions = createGlobalStyle`
    ::view-transition-old(root) {
      animation-duration: 200ms;
    }
  `;
  ```

  Both rules apply. `html.dark &` styles the card on a dark page, and the view transition rule applies to the page's transitions and to a transition started on an element inside `#app`. A root selector inside `:is()` or `:where()`, such as `:where(html.dark) &`, is prefixed like any other selector, so write it as `html.dark &` for it to apply. When the namespace is on a container inside the page, a rule starting at `html` or `:root` applies to nothing, so an embedded app never styles its host page. The joined form applies to a namespace made of ids, classes, attributes, or pseudo-classes with no spaces between them (`#app`, `.app.dark`, `[data-app]`). Any other namespace, such as `main #app` or `div#app`, is prefixed the same as every other selector.

- React Native: `aspect-ratio` accepts the same common forms as CSS: `16 / 9`, `auto`, `auto 16 / 9`, and `16 / 9 auto`. When `auto` is combined with a ratio on a component that does not have its own natural dimensions, styled-components uses the ratio and shows a development warning explaining that the `auto` part only applies to image-like elements. ([native-aspect-ratio-auto.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-aspect-ratio-auto.md))
- A `style` returned from `attrs` reaches React Native components. ([native-attrs-style.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-attrs-style.md))

  ```tsx
  const Badge = styled.View.attrs({ style: { opacity: 0.8 } })`
    padding: 4px;
  `;

  <Badge style={{ backgroundColor: "red" }} />; // padding, red background, and opacity 0.8
  ```

  - The attrs `style` layers over the `style` the component is given, so both apply and the attrs value wins a key both set, as on web.
  - The component's `!important` declarations still win over either.
  - Arrays and function styles (such as a `Pressable`'s) on either side are kept, and a function style is called with the current press state.

- The `background` shorthand is supported on React Native, including multiple layers, `position / size`, and a color on the final layer. Attachment, origin, and clipping are not supported on native: they warn in development, while web builds keep the full declaration. Invalid position, size, and repeat values are ignored, and invalid layered longhands warn in development. ([native-background.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-background.md))

  Simple center combinations in `background-position`, such as `center top`, fold to a single keyword (`top`) without changing layout.

  `background-size: cover` and `background-size: contain` are supported for gradient backgrounds: the gradient paints across the full element area. On react-native-web the browser handles the keywords directly, and `background-position` values like `0 0`, `50% 50%`, and `top left` pass through without a warning.

- Border line styles are supported on React Native: `hidden` acts like no border, repeated sides collapse quietly, and mixed sides keep the first drawable style with a development warning. Keywords React Native can't draw, such as `double`, are not supported on native and are ignored. Web builds keep CSS border styles as authored. ([native-border-line-styles.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-border-line-styles.md))
- Slash-separated `border-radius` values that resolve to a circular radius (for example `10px / 10px`) are supported on native. Truly elliptical combinations are not supported: they are ignored with a development warning. Web builds keep the authored value. ([native-border-radius-elliptical.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-border-radius-elliptical.md))
- React Native: CSS-wide keywords (`initial`, `inherit`, `unset`, `revert`, `revert-layer`) are not supported: it has no cascade to resolve them against and its style defaults differ from the CSS initial values, so the declaration is dropped with a development warning suggesting an explicit value. On the web the browser resolves the keywords as usual. `direction: inherit` and `flex: initial` are supported, since React Native and the flex shorthand implement those directly. ([native-css-wide-keywords.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-css-wide-keywords.md))
- React Native: `direction: ltr` and `direction: rtl` are supported. Logical edges such as `margin-inline-start` and `padding-inline-end` follow that direction, so the same declaration can support left-to-right and right-to-left layouts on iOS, Android, and the web. ([native-direction-passthrough.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-direction-passthrough.md))
- React Native: fixes spec-compliance edge cases in the `flex` shorthand. `flex: initial` and a zero basis after grow and shrink factors match CSS behavior, and invalid negative grow, shrink, and basis values are ignored. ([native-flex-shorthand.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-flex-shorthand.md))
- A quoted `font-family` or `font` name on iOS and Android reads its CSS escapes, so `"A\"B"` names the face `A"B` and a backslash before a line break continues the name. React Native for Web keeps sending the name as written, and the browser reads the escapes. ([native-font-family-string-escapes.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-font-family-string-escapes.md))
- React Native: `interactivity: inert` is supported. The styled component and its subtree stop responding to touch, reject D-pad / keyboard focus, and are hidden from screen readers (VoiceOver on iOS, TalkBack on Android). Not supported: a focusable child rendered inside an inert subtree on Android can still receive focus, which a development warning flags. ([native-interactivity-inert.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-interactivity-inert.md))

  react-native-web lets the browser honor the property natively via the HTML `inert` attribute.

- React Native: logical border shorthands expand to their longhands: ([native-logical-border-shorthands.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-logical-border-shorthands.md))

  - Per-edge color, style, and width declarations such as `border-inline-start-color` and `border-block-end-width`.
  - Axis shorthands such as `border-inline-color`, `border-block-width`, `border-inline`, and `border-block`.
  - Single-edge shorthands such as `border-inline-start` and `border-block-end`.

  Width and color apply to the matching logical edge. Per-edge border styles show a development warning on React Native, because the platform supports one `border-style` for the whole element. On react-native-web the browser handles per-edge styles. `outline-style: hidden` gets a clearer warning.

- React Native: several CSS constructs that platform primitives can't render emit a clear development warning with a suggested alternative. This covers conic gradients (`conic-gradient()` / `repeating-conic-gradient()`), the `order` property, `text-decoration-thickness` / `text-underline-offset` / `text-underline-position`, and the advanced `text-overflow` forms (string, `fade`, and two-value). Each warning names the construct, explains why it can't run on iOS or Android, and points at a workaround. The web renders all of these natively. ([native-loud-warnings.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-loud-warnings.md))
- React Native: on Expo and other Metro projects, importing from `styled-components/native` selects the correct build automatically for each platform, so react-native-web stays out of your iOS and Android bundles and no custom Metro resolver workaround is needed. This keeps the device bundle small and styling intact on device. ([native-metro-platform-resolution.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-metro-platform-resolution.md))
- The published package no longer ships a stray copy of the React Native development dependencies under `native/node_modules`, which made the install roughly 60 MB larger than the library itself. It also drops `test-utils/`, the repository's own test helpers, which import modules the package does not include and so could not be loaded from an install. ([native-node-modules-pack.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-node-modules-pack.md))
- React Native: `perspective` is supported as a standalone property, so it can combine with child transforms like `rotateY` or `rotateX` to create depth. Very small values are clamped to `1px` to match browser behavior. ([native-perspective-transform-style.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-perspective-transform-style.md))

  `translate: x y z` keeps its Z value on React Native, and the three-argument `translate(x, y, z)` transform function is supported on iOS and Android.

  `transform-style: preserve-3d` is isolated automatically for animated 3D transforms. A static declaration has no effect on iOS without a perspective surface and drops with a development warning. On react-native-web the browser handles all of these properties.

- React Native: the `place-content` shorthand is supported. `start`, `end`, and `space-evenly` match CSS Box Alignment behavior on iOS, Android, and react-native-web. ([native-place-content.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-place-content.md))
- React Native: the `place-items` and `place-self` shorthands are supported. As on the web, the second value defaults to the first when omitted. Keywords like `start`, `end`, `self-start`, and `self-end` produce the same layout on iOS, Android, and react-native-web. ([native-place-items-self.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-place-items-self.md))
- React Native: pseudo-class rules behave correctly on every element. `&:active`, `&:hover` and `&:focus` follow the live interaction state only `Pressable` supplies. On any other element (`View`, `Text`, ...) the base styles apply normally, the unreachable rules are skipped, and a development warning names the elements that do support them. A custom component that spreads `style` onto a `View` keeps all its styles when its only state rules are `&:disabled`, `&:enabled`, `&:read-only` or `&:read-write`. A negation inside `@media` or `@supports` keeps its meaning: `&:not(:active)` applies only while the element is not pressed, and `&:not([data-busy])` only while the attribute is absent. Rules fenced behind a media query that does not match (such as web-only `@media (hover: hover)` blocks) stay silent. See https://styled-components.com/docs/compatibility for which element supports each pseudo-class. ([native-pseudo-state-non-pressable.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-pseudo-state-non-pressable.md))
- React Native: the `rem` length unit is supported. It uses the app's root font size, `16` by default, so `width: 1rem` becomes `16` and `width: 2rem` becomes `32`. `rem` is supported on its own and inside `calc()`. On react-native-web the browser handles it. ([native-rem-unit.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-rem-unit.md))
- React Native: `text-wrap-mode` and `text-wrap-style` are supported alongside the `text-wrap` shorthand. `nowrap` clips text to a single line, and on Android, `balance` and `pretty` use the platform's higher-quality line breaking. ([native-text-wrap-longhands.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-text-wrap-longhands.md))
- React Native: `transform-box` shows a development warning on iOS and Android explaining that React Native transforms use the view center as their reference box. Use `transform-origin` when you need to move the pivot point. On react-native-web the browser handles `transform-box`. ([native-transform-box-warn.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-transform-box-warn.md))
- An unquoted `font-family` or `font` name stays whole on iOS, Android, and React Native for Web. A name holding a CSS escape reads as a browser reads it, so `A\42 B` names the face `ABB` and `\73 erif` is the generic keyword `serif`. A name starting with a hyphen, such as `-apple-system`, is one name, and a `font` declaration holding one keeps its size and weight. A keyword the library matches, such as `\62 old` in `font`, reads correctly too. A value that reaches React Native as text, such as the color in `color: r\65 d` or `border: 1px solid r\65 d`, keeps the escape as written and isn't read as `red`, and an escape inside a unit (`10\70 x`) isn't read. A vendor-prefixed name in a transition, such as `transition-property: -webkit-transform, opacity`, reads as `transform` at its place in the list. A sign belongs on a number inside math, as in a browser, so `calc(-pi * 1px)` holds the name `-pi` and warns in development, while `calc(-1 * pi * 1px)` resolves. ([native-unquoted-name-escapes.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-unquoted-name-escapes.md))
- `vertical-align: top | middle | bottom` on a styled `<Text>` positions text content within the Text's box on react-native-web, matching the visual semantic of React Native's `verticalAlign` on Android (textAlignVertical). It applies wherever a rule styles the component's own element, including `&:hover`, attribute selectors and rules inside `@media`, also under a `StyleSheetManager` namespace; rules on descendants or pseudo-elements, and global styles, keep the browser's own `vertical-align`. Any other value in a later rule, such as `vertical-align: baseline`, undoes the alignment, and the browser's own baseline-shifting semantics still apply to inline text. It needs a browser from 2024 or later (Chrome 123, Firefox 125, Safari 17.4); older browsers ignore the alignment. ([native-vertical-align.md](https://github.com/styled-components/styled-components/commits/main/.changeset/native-vertical-align.md))

  On iOS a development warning fires when `vertical-align` is set on a native `<Text>` or `<TextInput>`: React Native 0.85 has no platform API for vertically aligning text content inside a fixed-height `<Text>` or `<TextInput>` there, so the declaration silently has no effect. For `<Text>`, the warning points to the workaround: wrap the Text in a View and use `justify-content` for the vertical alignment. `<TextInput>` has no Text-level workaround on iOS today.

- Development builds warn when two different plugins used with `<StyleSheetManager>` share a `name` under the same `namespace`. The message names the shared name and tells you to give each plugin its own name. ([plugin-name-collision.md](https://github.com/styled-components/styled-components/commits/main/.changeset/plugin-name-collision.md))

  Plugins that share a name under the same `namespace` produce the same class, on the client, in server rendering, and in server components. The first subtree to render supplies the CSS for every subtree using that name. Production builds do not emit this warning. Plugins with one name under different namespaces produce different classes and do not warn.

- Fixed a protocol-relative value after a colon being removed as a `//` line comment. `--cdn: //cdn.example.com/x.png;` now keeps its value, with or without spaces between the colon and the slashes. A `//` on a later line than the colon is still removed as a comment. ([protocol-relative-value-after-colon.md](https://github.com/styled-components/styled-components/commits/main/.changeset/protocol-relative-value-after-colon.md))
- A styled component rendered as an item of an async iterable (such as an async generator) in a server component renders in development builds instead of throwing "Cannot read properties of null (reading 'useDebugValue')". ([rsc-async-iterable-dev.md](https://github.com/styled-components/styled-components/commits/main/.changeset/rsc-async-iterable-dev.md))
- In server components, a `<StyleSheetManager>`'s settings (`plugins`, `namespace`, `shouldForwardProp`) apply to exactly the components rendered inside it, however large or async the page is. ([rsc-nested-stylesheetmanager.md](https://github.com/styled-components/styled-components/commits/main/.changeset/rsc-nested-stylesheetmanager.md))

  ```jsx
  <StyleSheetManager plugins={[outerPlugin]}>
    <ChildA />
    <StyleSheetManager plugins={[innerPlugin]}>
      <ChildB />
    </StyleSheetManager>
    <ChildC />
  </StyleSheetManager>
  <Sidebar />
  ```

  `ChildB` is styled with the inner manager's plugins, `ChildA` and `ChildC` with the outer manager's, and `Sidebar` with neither.

  Client components are unchanged: they take their settings from the nearest `<StyleSheetManager>` rendered on the client, such as the one in your style registry.

- Fixed styles from server components and `createGlobalStyle` disappearing when React reveals content from behind a `<Suspense>` boundary, or when a navigation swaps one sibling route for another. A component first rendered inside a loading fallback, or a global style mounted by both a layout and its page, could end up with a class name but no matching rule, or with no global styles at all. ([rsc-suspense-style-removal.md](https://github.com/styled-components/styled-components/commits/main/.changeset/rsc-suspense-style-removal.md))

  Every server-rendered styled component and global style carries the rules it needs, so no instance depends on another surviving. The data React sends to the browser includes each distinct style once.

- A React Native scroller only snaps if it declared `scroll-snap-type` itself. ([scroll-snap-needs-a-declared-type.md](https://github.com/styled-components/styled-components/commits/main/.changeset/scroll-snap-needs-a-declared-type.md))

  `scroll-snap-align` on a child used to make any styled `ScrollView` snap, even one that never opted in. Two scrollers sharing a card component meant the one meant to drift freely snapped along with the one that asked to. This matches css-scroll-snap-1, where the initial `scroll-snap-type: none` makes an element a non-snapping container and a descendant's `scroll-snap-align` has no effect there.

- The browser bundle is about 1 kB smaller gzipped, with the same styling behavior. ([smaller-browser-bundle.md](https://github.com/styled-components/styled-components/commits/main/.changeset/smaller-browser-bundle.md))

  Internal fields of the stylesheet and style objects have been removed from the published type declarations. None of them were documented or usable from app code.

  In object styles, a numeric value whose key is a built-in object name such as `constructor` gets `px` like any other unknown property. No CSS property has such a name.

- Fix a typo in errors. ([soft-ads-push.md](https://github.com/styled-components/styled-components/commits/main/.changeset/soft-ads-push.md))
- Server-side output escapes `</style>` substrings (rewritten as the CSS hex escape `\3C/style`, which the CSS engine still parses identically) and HTML-escapes nonce values before they reach the rendered `<style ...>` tag, so user-supplied content interpolated into styles can't break out and inject markup. In-browser style injection is unaffected. ([ssr-xss-hardening.md](https://github.com/styled-components/styled-components/commits/main/.changeset/ssr-xss-hardening.md))
- A few smaller styling fixes: ([style-object-and-self-reference-fixes.md](https://github.com/styled-components/styled-components/commits/main/.changeset/style-object-and-self-reference-fixes.md))

  - An object with no prototype, as from `Object.create(null)`, works as a style object.
  - `${false} & + & { ... }` targets the same elements as `& + & { ... }`.
  - On the web, a component's automatic `container-name` reads `container-type` and `container-name` written in a `&` block, so `& { container-name: sidebar; }` keeps your name. On React Native, write `container-type` outside a `&` block. See https://styled-components.com/docs/compatibility for the selectors React Native supports.
  - A `createGlobalStyle` rendered in a server component includes the keyframes it references.

- `styled()` wrapping a generic polymorphic component keeps its declared props narrow. ([styled-generic-polymorphic-narrows-props.md](https://github.com/styled-components/styled-components/commits/main/.changeset/styled-generic-polymorphic-narrows-props.md))

  Wrapping a component whose props are generic over an element type, such as the common `<C extends React.ElementType>(props: PolymorphicProps<C, OwnProps>)` pattern, let the styled result accept prop values the component itself rejects: `styled(Button)` would take `variant="anything"` even though `<Button variant="anything">` is a type error. The wrapper now narrows those props exactly as the direct component does, so a bad value is caught in both places. Valid props, children, and plain (non-generic) targets are unaffected.

- A plain object with a custom `toString()` interpolated into a template stringifies via that method rather than expanding its keys as a CSS-property block. Useful for design-token shapes where the token resolves to a default value but also carries alternate sub-values: ([toString-design-tokens.md](https://github.com/styled-components/styled-components/commits/main/.changeset/toString-design-tokens.md))

  ```ts
  const ink = {
    default: "#000",
    subtle: "#444",
    toString() {
      return this.default;
    },
  };

  const Heading = styled.h1`
    color: ${ink};
  `;
  ```

- Fixed errors inside styled-components' own type declarations, with `skipLibCheck` turned off, for projects without `@types/react-dom` or `@types/node` installed. The `ServerStyleSheet` streaming API's types referenced types that only those packages provide. `interleaveWithNodeStream` still accepts the result of `renderToPipeableStream` and Node readable streams exactly as before, and with `@types/node` installed it still returns a full Node stream type. ([types-server-stream-without-react-dom-types.md](https://github.com/styled-components/styled-components/commits/main/.changeset/types-server-stream-without-react-dom-types.md))
- Fix wrapping a component whose props are a union. The wrapped version accepted only the props common to every member, so a prop belonging to just one member was rejected even though the unwrapped component accepts it. The same applied when `as` pointed at such a component. ([union-props-survive-styled.md](https://github.com/styled-components/styled-components/commits/main/.changeset/union-props-survive-styled.md))
- Numbers for `gridArea` and `lineClamp` in object styles render without a unit, the same way React's inline `style` prop renders them: ([unitless-grid-area-line-clamp.md](https://github.com/styled-components/styled-components/commits/main/.changeset/unitless-grid-area-line-clamp.md))

  ```ts
  const Item = styled.div({ gridArea: 2, lineClamp: 3 });
  // grid-area: 2; line-clamp: 3;
  ```

  Components that set either property to a number get a new class name on upgrade, since the emitted CSS changes.

- Fix wrapping a component whose props cannot be inspected statically, such as the polymorphic factory components Mantine ships. Every prop was rejected, `children` included. Declaring props of your own on the wrapper no longer switches the behavior back off either. ([untyped-target-props.md](https://github.com/styled-components/styled-components/commits/main/.changeset/untyped-target-props.md))
- A development warning fires when server-rendered styles reach the browser inside a `<style>` tag that React manages through its `precedence` attribute. React serves such a tag under its own attributes, so styled-components cannot recognize the styles as its own and injects every rule a second time on the client. The page still looks correct, which is why this goes unnoticed, and the warning names the fix: emit the tag from `ServerStyleSheet#getStyleElement()` and pass neither `precedence` nor `href`. ([warn-unadoptable-server-styles.md](https://github.com/styled-components/styled-components/commits/main/.changeset/warn-unadoptable-server-styles.md))

  The warning covers server styles found in the document or in a shadow root at the moment styles are adopted. Styles that arrive later, such as those flushed for a Suspense boundary that resolves after adoption, are outside its reach.

- Development warnings say what to do about the problem they report. Each one names the construct that triggered it and ends with a concrete fix, for example "Wrap the tree in a `<ThemeProvider theme={...}>` or pass a theme prop." for `withTheme`, or "Load the stylesheet with a `<link>` tag instead" for `@import` inside `createGlobalStyle`. Production builds are unaffected; these messages only appear in development. ([warnings-name-a-fix.md](https://github.com/styled-components/styled-components/commits/main/.changeset/warnings-name-a-fix.md))

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
  const theme = createTheme({ colors: { primary: "#0070f3" } });
  // theme.colors.primary → "var(--sc-colors-primary, #0070f3)"
  // theme.raw → original object
  // theme.vars.colors.primary → "--sc-colors-primary"
  // theme.resolve(el?) → computed values from DOM (client-only)
  // theme.GlobalStyle → component that emits CSS var declarations
  ```

  `vars` exposes bare CSS custom property names (same shape as the theme) for use in `createGlobalStyle` dark mode overrides without hand-writing variable names:

  ```ts
  const { vars } = createTheme({ colors: { bg: "#fff", text: "#000" } });

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
  import { StyleSheetManager, stylisPluginRSC } from "styled-components";

  <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
    {children}
  </StyleSheetManager>;
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
    max-height: calc(
      100px + 200px + 300px
    ); // This comment no longer breaks parsing
    background-color: green;
  `;
  ```

- 7ff7002: Fix: Contain invalid CSS syntax to just the affected line

  In styled-components v6, invalid CSS syntax (like unbalanced braces) could cause all subsequent styles to be ignored. This fix ensures that malformed CSS only affects the specific declaration, not subsequent valid styles.

  **Example that now works:**

  ```tsx
  const Circle = styled.div`
    width: 100px;
    line-height: ${() => "14px}"}; // ⛔️ This malformed line is dropped
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
  <Container style={{ "--color-primary": "orchid" }}>
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
