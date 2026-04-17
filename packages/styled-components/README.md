<div align="center">
  <a href="https://styled-components.com">
    <img alt="styled-components" src="https://raw.githubusercontent.com/styled-components/brand/master/styled-components.png" height="150px" />
  </a>
</div>

<br />

<div align="center">
  <strong>Fast, expressive styling for React.</strong>
  <br />
  Server components, client components, streaming SSR, React Native—one API.
  <br />
  <br />
  <a href="https://www.npmjs.com/package/styled-components"><img src="https://img.shields.io/npm/dm/styled-components.svg" alt="npm downloads"></a>
  <a href="https://bundlephobia.com/result?p=styled-components" title="styled-components latest minified+gzip size"><img src="https://badgen.net/bundlephobia/minzip/styled-components" alt="gzip size"></a>
</div>

---

styled-components is largely maintained by one person. Please help fund the project for consistent long-term support and updates: [Open Collective](https://opencollective.com/styled-components)

---

Style React components with real CSS, scoped automatically and delivered only when needed. No class name juggling, no separate files, no build step required.

- **Works everywhere React runs.** Server components, client components, streaming SSR, and React Native—same API, automatic runtime detection.
- **Full CSS, no compromises.** Media queries, pseudo-selectors, nesting, keyframes, global styles. If CSS supports it, so does styled-components.
- **TypeScript-first.** Built-in types ship with the package. Props flow through to your styles with full inference—no `@types` install, no manual generics.
- **<13kB gzipped.** Small enough to disappear in your bundle. No build plugin required.

## Install

```sh
npm install styled-components
```

<details>
<summary>pnpm / yarn</summary>

```sh
pnpm add styled-components
```

```sh
yarn add styled-components
```

</details>

## Quick examples

### Dynamic props

Vary styles based on component props. Prefix transient props with `$` to keep them off the DOM.

```tsx
import styled from 'styled-components';

const Button = styled.button<{ $primary?: boolean }>`
  background: ${props => (props.$primary ? 'palevioletred' : 'white')};
  color: ${props => (props.$primary ? 'white' : 'palevioletred')};
  font-size: 1em;
  padding: 0.25em 1em;
  border: 2px solid palevioletred;
  border-radius: 3px;
`;

<Button>Normal</Button>
<Button $primary>Primary</Button>
```

### Extending styles

Build variants on top of existing styled components.

```tsx
const TomatoButton = styled(Button)`
  background: tomato;
  color: white;
  border-color: tomato;
`;
```

### Polymorphic `as` prop

Swap the rendered element without changing styles.

```tsx
// Renders a <a> tag with Button styles
<Button as="a" href="/home">Link Button</Button>
```

### Pseudos and nesting

Use `&` to reference the component's generated class name—works with pseudo-classes, pseudo-elements, and nested selectors.

```tsx
const Input = styled.input`
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.5em;

  &:focus {
    border-color: palevioletred;
    outline: none;
  }

  &::placeholder {
    color: #aaa;
  }
`;
```

### Animations

Define `@keyframes` once, reference them across components. Names are scoped automatically.

```tsx
import styled, { keyframes } from 'styled-components';

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  animation: ${rotate} 1s linear infinite;
  width: 40px;
  height: 40px;
  border: 3px solid palevioletred;
  border-top-color: transparent;
  border-radius: 50%;
`;
```

### Theming

Share design tokens across your app via React context. Every styled component receives `props.theme`.

```tsx
import styled, { ThemeProvider } from 'styled-components';

const theme = {
  fg: 'palevioletred',
  bg: 'white',
};

const Card = styled.div`
  background: ${props => props.theme.bg};
  color: ${props => props.theme.fg};
  padding: 2em;
`;

<ThemeProvider theme={theme}>
  <Card>Themed content</Card>
</ThemeProvider>
```

### RSC-compatible themes

`createTheme` turns your tokens into CSS custom properties. Class name hashes stay stable across theme variants—no hydration mismatch when switching light/dark.

```tsx
import styled, { createTheme, ThemeProvider } from 'styled-components';

const { theme, GlobalStyle: ThemeVars } = createTheme({
  colors: {
    fg: 'palevioletred',
    bg: 'white',
  },
  space: {
    md: '1rem',
  },
});

const Card = styled.div`
  color: ${theme.colors.fg};       /* var(--sc-colors-fg, palevioletred) */
  background: ${theme.colors.bg};
  padding: ${theme.space.md};
`;

// Render <ThemeVars /> at the root to emit the CSS variable declarations
// Pass the theme to ThemeProvider for stable hashes
<ThemeProvider theme={theme}>
  <ThemeVars />
  <Card>Token-driven content</Card>
</ThemeProvider>
```

### Shared styles with `css`

Extract reusable style blocks to share across components or apply conditionally.

```tsx
import styled, { css } from 'styled-components';

const truncate = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Label = styled.span`
  ${truncate}
  max-width: 200px;
`;
```

### Styling third-party components

Wrap any component that accepts a `className` prop.

```tsx
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const StyledLink = styled(Link)`
  color: palevioletred;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;
```

### Global styles

Inject app-wide CSS like resets and font faces. Supports theming and dynamic updates.

```tsx
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    font-family: system-ui, sans-serif;
  }
`;

// Render <GlobalStyle /> at the root of your app
```

### Attrs

Set default or static HTML attributes so consumers don't have to.

```tsx
const PasswordInput = styled.input.attrs({
  type: 'password',
  placeholder: 'Enter password',
})`
  border: 1px solid #ccc;
  padding: 0.5em;
`;
```

## Documentation

- [Getting started](https://styled-components.com/docs/basics)
- [API reference](https://styled-components.com/docs/api)
- [Server-side rendering](https://styled-components.com/docs/advanced#server-side-rendering)
- [React Server Components](https://styled-components.com/docs/advanced#react-server-components)
- [Theming](https://styled-components.com/docs/advanced#theming)
- [React Native](https://styled-components.com/docs/basics#react-native)

## Community

[Contributing guidelines](./CONTRIBUTING.md) | [Code of Conduct](./CODE_OF_CONDUCT.md) | [awesome-styled-components](https://github.com/styled-components/awesome-styled-components)

## Contributors

This project exists thanks to all the people who contribute.

<a href="https://github.com/styled-components/styled-components/graphs/contributors"><img src="https://opencollective.com/styled-components/contributors.svg?width=890" /></a>

## Backers

Thank you to all our backers! [[Become a backer](https://opencollective.com/styled-components#backer)]

<a href="https://opencollective.com/styled-components#backers" target="_blank"><img src="https://opencollective.com/styled-components/backers.svg?width=890"></a>

## Sponsors

Support this project by becoming a sponsor. [[Become a sponsor](https://opencollective.com/styled-components#sponsor)]

<a href="https://opencollective.com/styled-components#sponsors" target="_blank"><img src="https://opencollective.com/styled-components/sponsors.svg?width=890"></a>

## Acknowledgements

This project builds on earlier work by Charlie Somerville, Nik Graf, Sunil Pai, Michael Chan, Andrey Popp, Jed Watson, and Andrey Sitnik. Special thanks to [@okonet](https://github.com/okonet) for the logo.

## License

Licensed under the MIT License, Copyright © 2016-present styled-components contributors. See [LICENSE](./LICENSE) for details.
