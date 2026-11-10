# React Native substrate for the native polyfills

The native layer polyfills modern CSS on top of React Native's own style engine. Each polyfill is written against what RN already ships: where RN understands a feature we pass it through, where RN diverges from CSS we polyfill, and where neither is possible we `warnOnce`. This doc is the version-anchored map of RN's substrate that decides which of those three a given feature gets.

This is the RN-substrate view: what the platform underneath us can do. It is distinct from `packages/styled-components/docs/rn-css-compatibility.md`, which is the consumer-facing ledger of what works in styled-components. Substrate first here; the compat ledger derives from it.

## RN CSS capability by version

Snapshot as of RN 0.86 (released 2026-06-11); the repo installs RN 0.85, so 0.86 rows are untested here. RN moves fast, so every row is version-stamped; re-verify against the RN changelog before trusting a floor.

The New Architecture (Fabric + TurboModules + bridgeless) is mandatory from RN 0.82 onward: `newArchEnabled=false` (Android) and `RCT_NEW_ARCH_ENABLED=0` (iOS) are ignored. RN 0.81 / Expo SDK 54 are the last versions that can run the Legacy Architecture. Every "New Arch only" feature below is therefore unconditionally available from 0.82 up.

### Style props by RN floor

- `box-shadow`: CSS string syntax directly (`"0 2px 4px red, inset 0 1px 2px blue"`), multiple shadows, `inset`. RN 0.76+.
- `filter`: CSS filter syntax as a raw string. RN 0.76+. Android and iOS both gate a subset; see the filter sections below.
- `mix-blend-mode`: 16 CSS Compositing 1 blend modes. RN 0.77+. The 17th value `plus-lighter` (Compositing 2) landed on `View` in RN 0.86; RN 0.85 silently drops it. Android needs API 29+ (Android 10) and silently drops the prop on API 24-28.
- `isolation`: `auto`, `isolate`. RN 0.77+, New Arch only. Shared Fabric C++ prop, not iOS-only despite claims in circulation.
- `display: contents`: RN 0.77+, New Arch only. The 0.86 Yoga node-ownership fix inside absolutely-positioned subtrees is a bugfix to this, not its introduction.
- `outline` longhands (`outline-width`, `outline-style`, `outline-color`, `outline-offset`): RN 0.77+.
- `box-sizing`: `border-box`, `content-box`. New Arch only.
- `inset` properties (`inset`, `inset-block`, `inset-block-start/end`, `inset-inline`, `inset-inline-start/end`): New Arch only.
- `gap` / `row-gap` / `column-gap`: accept percentage values. RN 0.75+.
- `cursor`: `auto`, `pointer` (iOS 17+).
- `experimental_backgroundImage` (gradients as a raw string, experimental): the two gradient types landed four minors apart despite sharing the prop. `linear-gradient()` and `repeating-linear-gradient()` in RN 0.76.0; `radial-gradient()` only in RN 0.80.0. A matrix stating "gradients: 0.76+" over-claims radial on 0.76-0.79 where there is none.
- Standard background names: RN registers `backgroundImage` from 0.87 and `backgroundSize` / `backgroundPosition` / `backgroundRepeat` from 0.88, where the `experimental_*` forms turn `@deprecated`; 0.85-0.86 drop the standard names silently. Across the peer range, every background declaration emits both keys carrying the full layered declaration (`PASSTHROUGH_PROPS` in `src/native/transform/passthrough.ts`). The experimental key differs in two places: `cover` / `contain` fold to `auto` there, because RN's native parser drops the bare keywords and an empty size list crashes the Android drawable (`substituteBackgroundSizeKeywordsForNative`); and `experimental_backgroundImage` may carry system-color stops expanded to an object array.

### `filter` on Android: hard API-31 cliff, applied per filter list

- `blur` and `dropShadow` need `android.graphics.RenderEffect`, absent below API 31, so they are gated at Android 12+. Below 31 the branch has no `else`, so they silently do nothing rather than degrading.
- Color-matrix filters (`brightness`, `contrast`, `grayscale`, `sepia`, `saturate`, `hue-rotate`, `invert`, `opacity`) have no filter-specific gate. They route through an ungated `ColorMatrixColorFilter` and work on any Android RN itself runs on (RN's project-wide minSdk 24 since 0.76). Do not read "minSdk 24" as a filter gate symmetrical to the API-31 one; only the latter is a real version check.
- The check is over the whole list: `isOnlyColorMatrixFilters()` returns false the moment any entry is `blur` or `dropShadow`, pushing the entire list onto the RenderEffect path. Mixing `blur` with `brightness` in one `filter` value silently drops the `brightness` too on API 24-30, where `brightness` alone would have worked. Split the blur onto a separate nested view. Feature-detect the API level, not just the platform.

### `filter` on iOS: SwiftUI backend still opt-in

As of 0.86, the iOS SwiftUI filter backend is still gated behind `ReactNativeReleaseLevel = experimental`. On default Fabric, only `brightness()` and `opacity()` render; `blur` / `grayscale` / `saturate` / `contrast` / `hue-rotate` / `drop-shadow` need the experimental backend. This gate did not change in 0.86.

### Native-driver animation

- RN 0.85: `Animated` native driver gained animatable support for `borderCurve`, `borderStyle`, `pointerEvents`, `isolation`, `cursor`, `boxShadow`, `mixBlendMode`, and `filter`. `useNativeDriver: true` also animates layout props (`flex` and position) for the first time; the prior "layout props cannot use the native driver" limitation is lifted.
- RN 0.86: fixed a 1-frame latency in the C++ `NativeAnimatedNodesManager` for scroll-driven animations by processing the graph synchronously per scroll event.

### 0.85 removals and migrations

- `StyleSheet.absoluteFillObject` removed (deprecated in 0.82); use `StyleSheet.absoluteFill` (same object). Source-breaking.
- Jest preset extracted to a scoped package: `preset: 'react-native'` becomes `preset: '@react-native/jest-preset'`. Required migration: a forwarding shim remains at `react-native/jest-preset`, but it throws until `@react-native/jest-preset` is installed as a direct dependency.
- `AccessibilityInfo.setAccessibilityFocus` deprecated; use `sendAccessibilityEvent`.

### 0.86 no-churn signal

0.86 shipped zero user-facing breaking changes (second consecutive, after 0.83). The runtime style-key registry (`ReactNativeStyleAttributes`) is unchanged between 0.85 and 0.86 for every CSS-relevant key. Use that as a "no registry churn" signal when bumping a styling layer's RN floor from 0.85 to 0.86.

### RSC on native

Experimental, only through Expo Router (SDK 52+, SDK 53 beta for production). RN core has not merged RSC; the whole `react-native` package carries a top-level `"use client"`, so `StyleSheet.create`, `Platform.OS`, and all RN primitives are inaccessible from server components. No CSS-in-JS library supports RN RSC. react-native-web does not support RSC either (its primitives depend on React Context for RTL detection).

## Yoga flex-shrink default divergence

RN ships a vendored Yoga whose `flex-shrink` default is `0`, not CSS's `1`. This is a long-standing RN architecture choice, durable rather than version-fragile (verified on RN 0.85).

- `Style.h` defines `DefaultFlexShrink = 0.0f` and `WebDefaultFlexShrink = 1.0f`. The web-aligned value applies only when `config->useWebDefaults()` is true. RN ships no call to `setUseWebDefaults(true)`, so the effective RN default is `0`.
- The same `useWebDefaults` gate also flips `align-content` (RN default `flex-start` vs web `stretch`) and the `min-width` / `min-height` semantics on flex items.

This is a load-bearing invariant for any layout polyfill. RN baseline is `flex-shrink: 0`, so web-style layouts that rely on items shrinking need an explicit `flex-shrink: 1`, and a test that assumes the CSS default will diverge from native. When debugging "items not wrapping" versus "items shrinking inappropriately," check which side of this default the consumer expects.

## The declaration transform is in-house

The native compile pipeline owns its final `[property, value]` to RN-style transform (`src/native/transform/`); it does not depend on `css-to-react-native`. Keep it that way: a tight character-walk over CSS values fast-paths the common cases (color strings, numeric lengths, simple keywords) far cheaper than a general value-parser, and owning the transform means RN-accepted shapes the old dependency mishandled (`matrix()`, RTL logical properties like `marginStart`, `currentcolor`, multi-shadow and `inset` in `boxShadow`, comma-separated quoted font families) are ours to fix rather than blocked upstream.

## Every styled component renders its style context provider

- Every styled component outside server components renders a `NativeStyleContext` provider. An idle one passes its parent's own value object, so consumers do not re-render and the tree keeps its shape when a font size, line height or direction appears or leaves. A provider added only when a value changes would remount every descendant at that moment, losing its state.
- A styled `Pressable` adds a second provider inside its children, holding what its style function gives at the current press state. Its children turn into a function only when React Native already tracks presses (the style or the children are a function), so a fixed style costs no press tracking.
- The cost of the always-present provider is measured in the PR that added it (#5869); re-measure with `packages/ios-benchmark` before moving it.

## Interaction state React Native supplies

Verified on RN 0.85 and react-native-web 0.21.

### What the platform reports

- Pressable's style and children functions receive `{pressed}` only: no hover, focus or disabled.
- Each component decides "disabled" by its own rule, and the library keeps each rule as is:
  - Pressable: `disabled === true`.
  - TouchableOpacity and Text: `disabled ?? aria-disabled ?? accessibilityState.disabled`.
  - TouchableHighlight: `disabled ?? accessibilityState.disabled` (it ignores `aria-disabled`).
  - Switch: on Android `disabled ?? accessibilityState.disabled`; on iOS `disabled` alone.
  - TouchableWithoutFeedback and TouchableNativeFeedback clone their one child, and Button styles its own View and Text; none applies its `style`, so no state rule on them reaches a host.
- TextInput has no `disabled` prop. `readOnly` beats `editable`, and `tabIndex` beats `focusable`.
- react-native-web writes `aria-disabled="true"` from `aria-disabled` or `accessibilityDisabled`, and native `disabled` on `button`, `input`, `select` and `textarea`. Pressable passes `aria-disabled` from `disabled`, overwriting a caller's `aria-disabled`; the Touchables pass `accessibilityDisabled`; Switch puts `disabled` only on its inner checkbox (and its `ref` there), passing `aria-disabled` through to its root; Text writes nothing from `disabled`. It reads no `accessibilityState` (TouchableWithoutFeedback aside), and any non-null `aria-readonly`, `false` included, makes an input read-only.

### How native matches element states

- A built-in is recognized by identity: the target, under any `styled()` layers, is the `react-native` export itself, or a wrapper whose name is `Animated(X)`, `AnimatedComponent(X)` or `Reanimated(X)` for a built-in `X`, which is matched by name alone. A component that only shares a built-in's name (a design system's `Button` or `Text`) follows the custom-component rules, and its function style passes through. `line-clamp` and scroller detection match by name, so a wrapper named `Text` or `ScrollView` gets them.
- `:disabled`, `:enabled`, `:read-only` and `:read-write` read the props the element receives (after `.attrs()` and `shouldForwardProp`), never a style function's argument. A developer's own state reaches these pseudo-classes only through a real prop.
- `:enabled` matches every element that is not disabled, on native and on the web bridge. This deviates from [Selectors 4 `:enabled`](https://drafts.csswg.org/selectors-4/#enableddisabled), which needs a matching disabled state, so that the two always partition.
- `:read-write` matches a TextInput that is not disabled, not `aria-readonly`, and editable by RN's own precedence; a custom component only when not disabled and `readOnly={false}`, or `editable={true}` with no `readOnly` (`readOnly` beats `editable`, as on TextInput); nothing else. Every other element is `:read-only`.
- TextInput given `disabled` or `aria-disabled` is translated to `readOnly`, `editable={false}`, `focusable={false}` and `aria-disabled`, dropping `tabIndex`, so it beats every editing and focus prop. A TextInput given `aria-readonly={true}` gets `readOnly`, so it is read-only on native as on the web.
- Style form: a rule set reading only element states resolves to a plain style object on every target. A function style is passed only when an interaction rule (`:active`, `:focus`, `:hover`) exists or the caller passes a function `style`. A custom wrapper that spreads `style` onto a View drops a function style entirely.
- A compound (`&:active:not(:disabled)`, `&[aria-pressed='true']:hover`, `&[x]:hover:not(:disabled)`, `&:first-child:hover:enabled`) applies only when every term holds, including several pseudo-classes after an attribute or structural selector, each may be `:not()` of one, and a negated attribute (`&:not([x]):hover`) may lead; its pseudo-class terms count toward the style form like single pseudo-classes, so one interaction term makes the style a function.
- A selector list is judged member by member: each supported member applies as if written alone, and each unsupported member (`& .icon` in `&:hover, & .icon`) is skipped with a dev warning naming that member (inside `@media`, `@container` or `@supports` it is skipped silently, as every unsupported nested rule is). Members of any supported kind mix, combinator members (`${A} &, ${B} &`) included.
- A stateless target warns once per pseudo-class it can never match, naming the elements that can; a negated term never warns.
- Native layers pseudo-class rules after attribute-selector rules and matched `@media`, `@container` and `@supports` rules, whatever their source order; the browser follows specificity, then source order.
- A `transition` does not animate a state flip on native; the value snaps.

## The web bridge transforms at the compiler seams

- `src/utils/bridgeRewrites.ts` runs behind `__NATIVE_WEB__`, read per call, in `mainCompiler` and every `StyleSheetManager` compiler: its transforms compose after any plugin's on the declaration seam (`decl`) and the selector seam (`rw`), before `formatDecl` and `wholeRule` re-read their output. Nothing rewrites emitted text. Web bundles drop it (treeshake sentinels in `treeshake.test.ts` "rn-web bridge build"); Jest flips the global after load and reaches the already-built `mainCompiler`.
- Unitless lengths (`width: 4`, `width: abs(-4)`) stay as authored on the bridge, so the browser drops them as invalid; native reads a bare number as px.
- var plus unit, per declaration in every rule (nested rules, at-rule bodies, keyframes, global styles), any property including custom properties: `var(--n, <number>)<unit>` becomes `calc(var(--n, <number>) * 1<unit>)`, skipping strings and url tokens. This repairs the `${t.space.sm}px` join, which the author wrote as a length. A custom property's computed text changes accordingly.
- `:not` wrap, on the selector seam for component rules only (`emit` with a parent selector; global styles and keyframes keep plain CSS): in each top-level comma member that starts with the component head (`namespace.prefix + parentSelector`, ending at a non-name character) and holds no top-level combinator, each run of adjacent `:not()` groups in that leading compound whose argument has no paren or escape and is not one of the pseudo-classes native matches (`:active`, `:disabled`, `:enabled`, `:focus`, `:focus-visible`, `:hover`, `:read-only`, `:read-write`) goes inside one `:where()`, in place; `:not(` matches in any ASCII case. A negated pseudo-class stays unwrapped so it cascades like its positive form (`&:not(:hover)` and `&:hover` weigh the same). Members with a combinator (`& .x`, `&:not(.a) + &`, `.dark:not(.x) &`) are untouched. A head holding a url token or an unclosed group is left whole. Residual: `&:not([x])::before` wraps before the pseudo-element. Each `:where(` adds to the composed-selector budget, so a head near the limit can drop.
- `:disabled` becomes `:is(:disabled,[aria-disabled=true])` and `:enabled` becomes `:not(:is(:disabled,[aria-disabled=true]))`, ASCII case-insensitive, on the selector seam (`rw`, composed after any plugin's) so every head is reached, global styles and `@media` included; at-rule preludes are not. The nested `:is()` gives `&:enabled` the text, weight and wrap treatment of `&:not(:disabled)`. The bridged Switch and Text set `aria-disabled` on their root when `disabled` is true, so their root matches. The bridged TextInput omits `aria-readonly={false}`, which react-native-web would read as read-only.
- Differences from native that remain: `aria-disabled` alone matches on TouchableHighlight, Switch, custom components and descendants under `& :disabled`, and beside `disabled={false}` on TouchableOpacity, Text and Switch (Pressable sets the attribute from `disabled`, so it follows native); `accessibilityState.disabled` does not match; `& :enabled` reaches every descendant; specificity and source order decide where native layers pseudo-classes last.
- `vertical-align` adds an `align-content` declaration at the start of its rule's declarations, so an authored `align-content` in the same rule wins (unless only the `vertical-align` is `!important`), written by `emit-web.ts` (behind `__NATIVE_WEB__`, read per call) only where the declaration sits on the component's own element: the emitter's own-element walk (the one behind the automatic `container-name`), so `&`, `&&`, `&:hover`, `&[x]` and rules inside `@media` count, while pseudo-element rules (`&::before`), descendants, siblings, mixed selector lists, global styles, keyframes and `compile()` get none. Mapping: `top`/`middle`/`bottom` -> `start`/`center`/`end`, css-align-3's table-cell rule; `inherit` and values holding `var(` unmapped; every other value -> `normal` (the spec treats them as baseline), so a later own rule cancels an earlier one. `!important` carries over. It reads the authored pair (a plugin's rewrite of `vertical-align` is not seen) and is added only when the authored declaration survives the plugin seam; the added declaration passes through the plugin seam itself.
- `vertical-align` differences that remain: `align-content` on a block container needs a Baseline 2024 browser; a `flex-wrap: wrap` View, even with one line, loses item stretch; `numberOfLines > 1` Text (`-webkit-box`) gets no effect; an authored `display: grid` or `block` View gets aligned.
