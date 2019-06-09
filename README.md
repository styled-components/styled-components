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
  <a href="https://www.npmjs.com/package/styled-components"><img src="https://www.styled-components.com/proxy/downloads.svg" alt="downloads: 600k/month"></a>
  <a href="#backers" alt="sponsors on Open Collective"><img src="https://opencollective.com/styled-components/backers/badge.svg" /></a> <a href="#sponsors" alt="Sponsors on Open Collective"><img src="https://opencollective.com/styled-components/sponsors/badge.svg" /></a> <a href="https://spectrum.chat/styled-components"><img src="https://withspectrum.github.io/badge/badge.svg" alt="Join the community on Spectrum"></a>
  <img src="https://www.styled-components.com/proxy/size.svg" alt="gzip size">
  <a href="#alternative-installation-methods"><img src="https://img.shields.io/badge/module%20formats-umd%2C%20cjs%2C%20esm-green.svg" alt="module formats: umd, cjs, esm"></a>
</div>

<br />
<br />

> ⚠️ **CANARY:** This is the `canary` branch of `styled-components`. It is published under the
> `@alpha` tag on npm and contains new features and changes for the next major version.

Utilising [tagged template literals](https://www.styled-components.com/docs/advanced#tagged-template-literals) (a recent addition to JavaScript) and the [power of CSS](https://www.styled-components.com/docs/api#supported-css), `styled-components` allows you to write actual CSS code to style your components. It also removes the mapping between components and styles – using components as a low-level styling construct could not be easier!

`styled-components` is compatible with both React (for web) and React Native – meaning it's the perfect choice even for truly universal apps! See the [documentation about React Native](https://www.styled-components.com/docs/basics#react-native) for more information.

_Supported by [Front End Center](https://frontend.center). Thank you for making this possible!_

## Upgrading from v4

1. `npm install styled-components@alpha react@^16.8 react-dom@^16.8 react-is@^16.8`
1. ??
1. Profit!

> Note that integrations like `jest-styled-components` that make use of internals will need to be updated to work with v5 and likely will not work properly during the alpha/beta period.

## [Docs](https://www.styled-components.com/docs)

**See the documentation at [styled-components.com/docs](https://www.styled-components.com/docs)** for more information about using `styled-components`!

Quicklinks to some of the most-visited pages:

- [**Getting started**](https://www.styled-components.com/docs/basics)
- [API Reference](https://styled-components.com/docs/api)
- [Theming](https://www.styled-components.com/docs/advanced#theming)
- [Server-side rendering](https://www.styled-components.com/docs/advanced#server-side-rendering)
- [Tagged Template Literals explained](https://www.styled-components.com/docs/advanced#tagged-template-literals)

## Example

<!-- prettier-ignore -->
```JSX
import React from 'react';

import styled from 'styled-components';

// Create a <Title> react component that renders an <h1> which is
// centered, palevioletred and sized at 1.5em
const Title = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;

// Create a <Wrapper> react component that renders a <section> with
// some padding and a papayawhip background
const Wrapper = styled.section`
  padding: 4em;
  background: papayawhip;
`;

// Use them like any other React component – except they're styled!
<Wrapper>
  <Title>Hello World, this is my first styled component!</Title>
</Wrapper>
```

This is what you'll see in your browser:

<div align="center">
  <a href="https://styled-components.com">
    <img alt="Screenshot of the above code ran in a browser" src="http://i.imgur.com/wUJpcjY.jpg" />
  </a>
</div>

## Babel Macro

If you're using tooling that has babel-plugin-macros set up, you can switch to the `styled-components/macro` import path instead to gain the effects of the babel plugin without further setup.

```js
import styled from 'styled-components/macro';

// A static className will be generated for Title (important for SSR)
const Title = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;
```

If you wish to provide configuration options to the babel plugin similar to how you would in a `.babelrc`, [see this guide](https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md#config-experimental). The config name is `"styledComponents"`.

## Built with `styled-components`

A lot of hard work goes into community libraries, projects, and guides. A lot of them make it easier to get started or help you with your next project! There’s also a whole lot of interesting apps and sites that people have built using styled-components.

Make sure to head over to [awesome-styled-components](https://github.com/styled-components/awesome-styled-components) to see them all! And please contribute and add your own work to the list so others can find it.

## Contributing

If you want to contribute to `styled-components` please see our [contributing and community guidelines](./CONTRIBUTING.md), they'll help you get set up locally and explain the whole process.

Please also note that all repositories under the `styled-components` organization follow our [Code of Conduct](./CODE_OF_CONDUCT.md), make sure to review and follow it.

## Badge

Let everyone know you're using _styled-components_ → [![style: styled-components](https://img.shields.io/badge/style-%F0%9F%92%85%20styled--components-orange.svg?colorB=daa357&colorA=db748e)](https://github.com/styled-components/styled-components)

```md
[![style: styled-components](https://img.shields.io/badge/style-%F0%9F%92%85%20styled--components-orange.svg?colorB=daa357&colorA=db748e)](https://github.com/styled-components/styled-components)
```

## Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].
<a href="https://github.com/styled-components/styled-components/graphs/contributors"><img src="https://opencollective.com/styled-components/contributors.svg?width=890" /></a>

## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/styled-components#backer)]

<a href="https://opencollective.com/styled-components#backers" target="_blank"><img src="https://opencollective.com/styled-components/backers.svg?width=890"></a>

## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/styled-components#sponsor)]

<a href="https://opencollective.com/styled-components/sponsor/0/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/1/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/2/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/3/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/4/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/5/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/6/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/7/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/8/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/9/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/9/avatar.svg"></a>

## License

Licensed under the MIT License, Copyright © 2016-present Glen Maddern and Maximilian Stoiber.

See [LICENSE](./LICENSE) for more information.

## Acknowledgements

This project builds on a long line of earlier work by clever folks all around the world. We'd like to thank Charlie Somerville, Nik Graf, Sunil Pai, Michael Chan, Andrey Popp, Jed Watson & Andrey Sitnik who contributed ideas, code or inspiration.

Special thanks to [@okonet](https://github.com/okonet) for the fantastic logo.
