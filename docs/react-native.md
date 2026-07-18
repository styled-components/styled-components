# React Native substrate for the native polyfills

The native layer polyfills modern CSS on top of React Native's own style engine. Each polyfill is written against what RN already ships: where RN understands a feature we pass it through, where RN diverges from CSS we polyfill, and where neither is possible we `warnOnce`. This doc is the version-anchored map of RN's substrate that decides which of those three a given feature gets.

This is the RN-substrate view: what the platform underneath us can do. It is distinct from `packages/styled-components/docs/rn-css-compatibility.md`, which is the consumer-facing ledger of what works in styled-components. Substrate first here; the compat ledger derives from it.

## RN CSS capability by version

Snapshot as of ~2026 (RN 0.86, released 2026-06-11). RN moves fast, so every row is version-stamped; re-verify against the RN changelog before trusting a floor.

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
- `experimental-background-image` (gradients as a raw string, experimental): the two gradient types landed four minors apart despite sharing the prop. `linear-gradient()` and `repeating-linear-gradient()` in RN 0.76.0; `radial-gradient()` only in RN 0.80.0. A matrix stating "gradients: 0.76+" over-claims radial on 0.76-0.79 where there is none.

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
- Jest preset extracted to a scoped package: `preset: 'react-native'` becomes `preset: '@react-native/jest-preset'`. Required migration, not an automatic shim.
- `AccessibilityInfo.setAccessibilityFocus` deprecated; use `sendAccessibilityEvent`.

### 0.86 no-churn signal

0.86 shipped zero user-facing breaking changes (second consecutive, after 0.83). The runtime style-key registry (`ReactNativeStyleAttributes`) is unchanged between 0.85 and 0.86 for every CSS-relevant key. Use that as a "no registry churn" signal when bumping a styling layer's RN floor from 0.85 to 0.86.

### RSC on native

Experimental, only through Expo Router (SDK 52+, SDK 53 beta for production). RN core has not merged RSC; the whole `react-native` package carries a top-level `"use client"`, so `StyleSheet.create`, `Platform.OS`, and all RN primitives are inaccessible from server components. No CSS-in-JS library supports RN RSC. react-native-web does not support RSC either (its primitives depend on React Context for RTL detection).

## Yoga flex-shrink default divergence

RN ships a vendored Yoga whose `flex-shrink` default is `0`, not CSS's `1`. This is a long-standing RN architecture choice, durable rather than version-fragile (verified on RN 0.85).

- `Style.h` defines `DefaultFlexShrink = 0.0f` and `WebDefaultFlexShrink = 1.0f`. The web-aligned value applies only when `config->useWebDefaults()` is true. RN ships no call to `setUseWebDefaults(true)`, so the effective RN default is `0`.
- The same `useWebDefaults` gate also flips `align-content` (RN default `flex-start` vs web `stretch`) and the `min-width` / `min-height` semantics on flex items.

This is a load-bearing invariant for any layout polyfill or rn-web parity test. RN baseline is `flex-shrink: 0`, so web-style layouts that rely on items shrinking need an explicit `flex-shrink: 1`, and a parity test that assumes the CSS default will diverge from native. When debugging "items not wrapping" versus "items shrinking inappropriately," check which side of this default the consumer expects.

## The declaration transform is in-house

The native compile pipeline owns its final `[property, value]` to RN-style transform (`src/native/transform/`); it does not depend on `css-to-react-native`. Keep it that way: a tight character-walk over CSS values fast-paths the common cases (color strings, numeric lengths, simple keywords) far cheaper than a general value-parser, and owning the transform means RN-accepted shapes the old dependency mishandled (`matrix()`, RTL logical properties like `marginStart`, `currentcolor`, multi-shadow and `inset` in `boxShadow`, comma-separated quoted font families) are ours to fix rather than blocked upstream.
