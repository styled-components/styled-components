## native-showcase

Expo Router app rendering every registry entry from `src/widgets/`. Used as the visual QA surface for v7 native polyfills across iOS, Android, and rn-web.

## Deep-link to a widget by slug (adb / xcrun)

The catalog reads `?focus=<slug>` from `useLocalSearchParams` and calls `scrollToIndex(anchorIndex.get(slug))`. The Expo scheme is `native-showcase` (`app.json`).

Android emulator:

```
adb shell am start -W -a android.intent.action.VIEW -d "native-showcase:///?focus=<slug>"
```

iOS simulator:

```
xcrun simctl openurl booted "native-showcase:///?focus=<slug>"
```

The intent is delivered live to the foreground instance (no app restart). Slugs come from `src/widgets/registry.ts` (e.g. `container-query-card`, `viewport-units-ribbon`, `keyframe-orchestra`). Much more reliable than swipe-and-screenshot for QA loops.

After a JS reload (double-R or Fast Refresh of the catalog), `?focus` intents can stop scrolling the catalog even though the activity receives them; bouncing between two different slugs does not recover it. Fall back to `adb shell input swipe` navigation, or cold-restart the app to restore deep-link handling.

## Nested scrollers on Android

Styled scrollers default `nestedScrollEnabled: true` (the library lifts it; user props win), so vertical scroller widgets inside the vertical catalog list work on Android without any explicit prop. If an inner scroller refuses gestures on Android, check that the widget hasn't overridden the prop to false.

## Source consumption

Metro resolves `styled-components` and `styled-components/native` directly to the library's TypeScript source via `metro.config.js`. The babel config substitutes the build-time constants (`__SERVER__`, `__NATIVE__`, `__NATIVE_WEB__`, `__DEV__`) so source compiles in place. No `pnpm build` step is needed between editing library code and reloading the showcase - Metro picks up the change on next refresh.

## Theme tokens

`t.space.*` / `t.fontSize.*` from `@/theme/tokens` are createTheme sentinels (CSS calc strings). JS arithmetic against them string-coerces silently. For raw RN style objects (`contentContainerStyle`, `StyleSheet.create`, third-party renderer styles), import `lightTheme` / `darkTheme` directly and pick via `useColorScheme()`.

## Markdown captions

`src/components/Markdown.tsx` wraps `markdown-to-jsx/native` with theme-aware overrides. Use `<InlineMarkdown variant="brief">` for one-line summaries and `<Markdown variant="hint">` for caption blocks. Backticks render as `code`, asterisks as `strong`, etc.

The native renderer dispatches `code` / `strong` / `b` / `em` / `i` through `h(Text, { style })` directly, bypassing the overrides map. Style those via the `variantStyles()` switch, not the overrides object.

## iOS Fast Refresh + forced view materialization

Do not put `collapsable={false}` on ancestors of per-frame-transformed scenes (e.g. the logo's SceneOrigin). On iOS Fabric, Fast Refresh remounts land on recycled host views whose transform state is not reliably reset; a forced-materialized wrapper shatters descendant positioning until a cold app restart. Cold mounts are always coherent, so if face positioning looks scattered after an HMR, restart the app before debugging anything else. Blend-group scoping should come from `isolation: isolate` (the library lifts the Android layer primitive automatically), not from manual materialization props.
