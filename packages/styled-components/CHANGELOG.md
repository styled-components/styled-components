# styled-components

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
