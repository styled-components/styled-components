# native-showcase

Cross-platform fidget catalog for styled-components v7. Same source runs on iOS via React Native and in the browser via react-native-web.

## Run

```sh
pnpm install
pnpm --filter styled-components build
pnpm --filter native-showcase web       # browser at localhost:8081
pnpm --filter native-showcase ios       # iOS simulator (via local dev client)
pnpm --filter native-showcase android   # Android emulator/device (via local dev client)
```

Each native script wraps `expo run:<platform>`, which generates a local native project and builds it. Expo SDK 56 canary doesn't have a matching Expo Go build, so the local dev-client flow is the only path. First run is slow (prebuild + dep install + native build); subsequent runs are incremental.

Requirements for iOS:

- macOS with Xcode 16+ and iOS 18+ simulator runtime
- Ruby + Bundler (`brew install rbenv && rbenv install 3.3.5`) for CocoaPods

Requirements for Android:

- Android Studio (provides JDK 21 at `/Applications/Android Studio.app/Contents/jbr/Contents/Home` on macOS — set as `JAVA_HOME` for the build session)
- Android SDK platform 36 + build-tools 36 + NDK 27 + CMake 3.22 (auto-installed on first build)
- An emulator or attached device. Create a Pixel-class AVD via Android Studio and boot it before running.
- The wrapper is pinned to Gradle 8.13. Expo SDK 56 canary's templated wrapper (Gradle 9.3.1) is incompatible with the Kotlin Gradle Plugin 2.1.20 that React Native 0.85 ships, so `prebuild` regeneration must be followed by re-pinning the wrapper to 8.13 in `android/gradle/wrapper/gradle-wrapper.properties` until upstream lands the Kotlin 2.2.x bump.

If `ios/` or `android/` doesn't exist yet, run `pnpm --filter native-showcase prebuild` once to generate them.

If you are iterating on styled-components source while the showcase is running, run `pnpm --filter styled-components build --watch` in a second terminal — Metro watches the dist output, not the source tree.

### Android dev-client connection

`expo run:android` boots Metro on `0.0.0.0:8081`; the dev client inside the emulator reaches it via `10.0.2.2:8081` (the emulator's NAT alias for the host loopback). If you see "Couldn't connect to ws://10.0.2.2:8081", make sure Metro is not bound only to localhost (don't pass `--localhost`).

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
