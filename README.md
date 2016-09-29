# Styled components

The best way to style react apps!

```
npm install --save styled-components
```

> Note: If you're not using `npm` as your package manager, aren't using a module bundler or aren't sure about either of those jump to [Alternative Installation Methods](#alternative-installation-methods).

## Basic Usage

This is what the basic usage of `styled-components` looks like.

We create two react components, `<Title>` and `<Wrapper>`, and render them from our `<HelloWorld>` component:

```JSX
import React from 'react';

import styled from 'styled-components';

// Create a <Title> react component that renders an <h1> which is centered, palevioletred and sized at 1.5em
const Title = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;

// Create a <Wrapper> react component that renders a <section> with some padding and a papayawhip background
const Wrapper = styled.section`
  padding: 4em;
  background: papayawhip;
`;

export default function HelloWorld() {
  // Render these styled components like normal react components. They will pass on all props and work
  // like normal react components – except they're styled!
  return (
    <Wrapper>
      <Title>Hello World, this is my first styled component!</Title>
    </Wrapper>
  );
}
```

This is what our `<HelloWorld>` component looks like when rendered:

<img alt="Screenshot of the above code ran in a browser" src="http://i.imgur.com/wUJpcjY.jpg" />

*<div align="center"><a href="http://www.webpackbin.com/VyQ9AYHpZ" target="_blank">Live demo</a></div>*

Styled components pass on all their props. Let's see an example of an `<input>` with a placeholder:

```JSX
import React from 'react';
import styled from 'styled-components';

// Create an <Input> component that'll render an <input> tag with some styles
const Input = styled.input`
  font-size: 1.25em;
  padding: 0.5em;
  margin: 0.5em;
  color: palevioletred;
  background: papayawhip;
  border: none;
  border-radius: 3px;
`;

export default function Form() {
  return (
    <form>
      {/* Render a styled input with a placeholder of "@mxstbr" */}
      <Input placeholder="@mxstbr" type="text" />
    </form>  
  );
}
```

Here's what this looks like in the browser, once empty and once filled in:

<img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/QoQiSui.jpg" />

*<div align="center"><a href="http://www.webpackbin.com/EyBu49rab" target="_blank">Live demo</a></div>*

## Alternative Installation Methods

If you're not using a module bundler or not using `npm` as your package manager, we also have a global ("UMD") build!

You can use that via the `unpkg` CDN to get `styled-components`, the URL is `https://unpkg.com/styled-components/dist/styled-components.min.js`.

To install `styled-components` with bower you'd do:

```
bower install styled-components=https://unpkg.com/styled-components/dist/styled-components.min.js
```

To use it from your HTML, add this at the bottom of your `index.html`, and you'll have access to the global `window.styled` variable:

```HTML
<script src="https://unpkg.com/styled-components/dist/styled-components.min.js" type="text/javascript"></script>
```

## License

Licensed under the MIT License, copyright © 2016 Glen Maddern and Maximilian Stoiber. With thanks to Charlie Somerville & lots of others.

See [LICENSE](./LICENSE) for more information.
