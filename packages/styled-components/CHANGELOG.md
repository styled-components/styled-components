# styled-components

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
