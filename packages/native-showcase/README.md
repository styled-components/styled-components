# native-showcase

Cross-platform fidget catalog for styled-components v7. Same source runs on iOS via React Native and in the browser via react-native-web.

## Run

```sh
pnpm install
pnpm --filter styled-components build
pnpm --filter native-showcase web   # browser at localhost:8081
pnpm --filter native-showcase ios   # iOS simulator (via local dev client)
```

The `ios` script uses `expo run:ios`, which generates a local Xcode project and builds it. Expo SDK 56 canary doesn't have a matching Expo Go build, so the local dev-client flow is the only path. First run is slow (prebuild + `pod install` + xcodebuild); subsequent runs are incremental.

Requirements for iOS:

- macOS with Xcode 16+ and iOS 18+ simulator runtime
- Ruby + Bundler (`brew install rbenv && rbenv install 3.3.5`) for CocoaPods

If `ios/` doesn't exist yet, run `pnpm --filter native-showcase prebuild` once to generate it.

If you are iterating on styled-components source while the showcase is running, run `pnpm --filter styled-components build --watch` in a second terminal — Metro watches the dist output, not the source tree.

## Adding a fidget

1. Create a new file in `src/widgets/` exporting a default React component.
2. Append an entry to `src/widgets/registry.ts` with a `category` from the `FidgetCategory` union. The catalog page groups by category automatically.

Each widget should focus on one engine feature and stay under ~120 lines.

## Categories

Each entry sits in one broad CSS category. Add new categories to `FidgetCategory` and `CATEGORY_ORDER` in `src/widgets/registry.ts`.

- Color: oklch / lab / color-mix / light-dark
- Visual effects: filter / box-shadow / gradient / transform / mix-blend-mode
- Layout: grid / aspect-ratio / @container / logical spacing
- Math & units: vw / cqw / calc / min / max / clamp
- Typography: font-variant / line-clamp / text-decoration
- Responsive environment: env() / @media / prefers-*
- Selectors & state: &:hover / &[attr] / @media + :state
- Theming: createTheme + ThemeProvider
