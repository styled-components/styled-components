<div align="center">
  <a href="https://www.styled-components.com">
    <img alt="styled-components" src="https://raw.githubusercontent.com/styled-components/brand/master/styled-components.png" height="150px" />
  </a>
</div>

<br />

<div align="center">
  <strong>Visual primitives for the component age. Use the best bits of ES6 and CSS to style your apps without stress 💅</strong>
  <br />
  <br />
  <a href="https://www.npmjs.com/package/styled-components"><img src="https://img.shields.io/npm/dm/styled-components.svg" alt="npm downloads"></a>
  <a href="https://bundlephobia.com/result?p=styled-components" title="styled-components latest minified+gzip size"><img src="https://badgen.net/bundlephobia/minzip/styled-components" alt="gzip size"></a>
</div>

---

`styled-components` lets you write actual CSS in your JavaScript using tagged template literals. It removes the mapping between components and styles, making components the styling primitive.

- Built-in TypeScript types (no `@types` package needed)
- React Server Components (RSC) support via automatic runtime detection
- React Native support
- Compatible with React 16.8+, including React 19

## Installation

```sh
npm install styled-components
```

```sh
pnpm add styled-components
```

```sh
yarn add styled-components
```

## Example

```jsx
import styled from 'styled-components';

const Title = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;

const Wrapper = styled.section`
  padding: 4em;
  background: papayawhip;
`;

function MyUI() {
  return (
    <Wrapper>
      <Title>Hello World, this is my first styled component!</Title>
    </Wrapper>
  );
}
```

Style objects are also supported:

```jsx
const Button = styled.button({
  color: 'grey',
});
```

## [Docs](https://www.styled-components.com/docs)

See the documentation at [styled-components.com/docs](https://www.styled-components.com/docs) for full usage information.

- [Getting started](https://www.styled-components.com/docs/basics)
- [API Reference](https://styled-components.com/docs/api)
- [Theming](https://www.styled-components.com/docs/advanced#theming)
- [Server-side rendering](https://www.styled-components.com/docs/advanced#server-side-rendering)
- [React Server Components](https://www.styled-components.com/docs/advanced#react-server-components)
- [React Native](https://www.styled-components.com/docs/basics#react-native)

## Contributing

See our [contributing and community guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

Check out [awesome-styled-components](https://github.com/styled-components/awesome-styled-components) for community libraries, projects, and examples.

## Contributors

This project exists thanks to all the people who contribute.

<a href="https://github.com/styled-components/styled-components/graphs/contributors"><img src="https://opencollective.com/styled-components/contributors.svg?width=890" /></a>

## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/styled-components#backer)]

<a href="https://opencollective.com/styled-components#backers" target="_blank"><img src="https://opencollective.com/styled-components/backers.svg?width=890"></a>

## Sponsors

Support this project by becoming a sponsor. [[Become a sponsor](https://opencollective.com/styled-components#sponsor)]

<a href="https://opencollective.com/styled-components#sponsors" target="_blank"><img src="https://opencollective.com/styled-components/sponsors.svg?width=890"></a>

## License

Licensed under the MIT License, Copyright © 2016-present styled-components contributors.

See [LICENSE](./LICENSE) for more information.

## Acknowledgements

This project builds on a long line of earlier work by clever folks all around the world. We'd like to thank Charlie Somerville, Nik Graf, Sunil Pai, Michael Chan, Andrey Popp, Jed Watson & Andrey Sitnik who contributed ideas, code or inspiration.

Special thanks to [@okonet](https://github.com/okonet) for the fantastic logo.
