When component styles are openly extensible, every style declaration becomes part of an undocumented public API. Even simple changes to styles can create unexpected breakages across our products. This may prevent us from improving components or supporting semantic versioning. However, we still need extensible component styles to place components within a layout.

Design your component APIs for stability by separating appearance styles from layout styles. Neither CSS nor the most popular styling libraries separate these concepts, but there are practical solutions to enforce a strict, stable API for components.

## Example

<!-- prettier-ignore -->
```JSX
import React from 'react';

import placeable from 'placed-components';

// Create a <Title> react component that renders an <h1> which is
// centered, palevioletred and sized at 1.5em
const Title = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;

// Create a <Wrapper> react component that renders a <section> with
// some padding and a papayawhip background
const Wrapper = placeable.section`
  padding: 4em;
  background: papayawhip;
`;

// Use them like any other React component – except they're styled!
<Wrapper>
  <Title>Hello World, this is my first placeable component!</Title>
</Wrapper>
```

This is what you'll see in your browser:

<div align="center">
NEED TO UPDATE
  <a href="https://placed-components.com">
    <img alt="Screenshot of the above code ran in a browser" src="http://i.imgur.com/wUJpcjY.jpg" />
  </a>
</div>

## Babel Macro

If you're using tooling that has babel-plugin-macros set up, you can switch to the `placed-components/macro` import path instead to gain the effects of the babel plugin without further setup.

```js
import placeable from 'placed-components/macro';

// A static className will be generated for Title (important for SSR)
const Title = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;
```

If you wish to provide configuration options to the babel plugin similar to how you would in a `.babelrc`, [see this guide](https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md#config-experimental). The config name is `"styledComponents"`.

## Built with `placed-components`

A lot of hard work goes into community libraries, projects, and guides. A lot of them make it easier to get started or help you with your next project! There’s also a whole lot of interesting apps and sites that people have built using placed-components.

## Contributing

If you want to contribute to `placed-components` please see our [contributing and community guidelines](./CONTRIBUTING.md), they'll help you get set up locally and explain the whole process.

Please also note that all repositories under the `placed-components` organization follow our [Code of Conduct](./CODE_OF_CONDUCT.md), make sure to review and follow it.

See [LICENSE](./LICENSE) for more information.
