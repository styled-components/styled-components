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

## Source consumption

The sandbox / showcase consume the built `dist/` of `styled-components`, not source. Run `pnpm --filter styled-components build` after editing library code before testing in the showcase.

## Theme tokens

`t.space.*` / `t.fontSize.*` from `@/theme/tokens` are createTheme sentinels (CSS calc strings). JS arithmetic against them string-coerces silently. For raw RN style objects (`contentContainerStyle`, `StyleSheet.create`, third-party renderer styles), import `lightTheme` / `darkTheme` directly and pick via `useColorScheme()`.

## Markdown captions

`src/components/Markdown.tsx` wraps `markdown-to-jsx/native` with theme-aware overrides. Use `<InlineMarkdown variant="brief">` for one-line summaries and `<Markdown variant="hint">` for caption blocks. Backticks render as `code`, asterisks as `strong`, etc.

The native renderer dispatches `code` / `strong` / `b` / `em` / `i` through `h(Text, { style })` directly, bypassing the overrides map. Style those via the `variantStyles()` switch, not the overrides object.
