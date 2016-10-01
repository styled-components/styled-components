# `styled-components`

The best way to style react apps!

```
npm install --save styled-components
```

> Note: If you're not using `npm` as your package manager, aren't using a module bundler or aren't sure about either of those jump to [Alternative Installation Methods](#alternative-installation-methods).

## Usage

This is what the usage of `styled-components` looks like.

### Basic

This creates two react components, `<Title>` and `<Wrapper>`:

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
```

This is what they look like when rendered:

```JSX
// These are like any other react component – except they're styled!
<Wrapper>
  <Title>Hello World, this is my first styled component!</Title>
</Wrapper>
```

<div align="center">
  <a href="http://www.webpackbin.com/VyQ9AYHpZ">
    <img alt="Screenshot of the above code ran in a browser" src="http://i.imgur.com/wUJpcjY.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

### Passed props

Styled components pass on all their props. This is a styled `<input>`:

```JS
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
```

You can just pass a `placeholder` prop into the `styled-component`. It will pass it on to the DOM node like any other react component:

```JSX
// Render a styled input with a placeholder of "@mxstbr"
<Input placeholder="@mxstbr" type="text" />
```

<div align="center">
  <a href="http://www.webpackbin.com/EyBu49rab">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/QoQiSui.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

### Adapting based on props

This is a button component that has a `primary` state. By setting `primary` to `true` when rendering it we adjust the background and text color.

```JSX
import styled from 'styled-components';

const Button = styled.button`
  /* Adapt the colors based on primary prop */
  background: ${(props) => props.primary ? 'palevioletred' : 'white'};
  color: ${(props) => props.primary ? 'white' : 'palevioletred'};

  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid palevioletred;
  border-radius: 3px;
`;

export default Button;
```

```JSX
<Button>Normal</Button>
<Button primary={true}>Primary</Button>
```

<div align="center">
  <a href="http://www.webpackbin.com/4JAqcmL6Z">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/4qlEdsx.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

### Overriding component styles

Taking the `Button` component from above and removing the primary rules, this is what we're left with – just a normal button:

```JSX
import styled from 'styled-components';

const Button = styled.button`
  background: white;
  color: palevioletred;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid palevioletred;
  border-radius: 3px;
`;

export default Button;
```

Let's say someplace else you want to reuse _most_ of the styles, but you want the color and border color to be `tomato` instead of `palevioletred`. Now you _could_ pass in an interpolated function and change them, but you want to have another component for this instead.

To accomplish this you can call `styled` as a function and pass in the previous component. Then you style that like any other styled-component, except it overrides the styles you pass in and keeps the not overridden ones around:

```JSX
// Tomatobutton.js

import React from 'react';
import styled from 'styled-components';

import Button from './Button';

const TomatoButton = styled(Button)`
color: tomato;
border-color: tomato;
`;

export default TomatoButton;
```

<div align="center">
  <a href="http://www.webpackbin.com/VJZQkBU6Z">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/LZZ3h5i.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

Instead of copy and pasting the styles or factoring out the CSS into a separate function we've now reused a part of the styles. By leveraging components as our low-level styling construct, our codebase becomes a lot clearer!

> You can also pass tag names into the `styled()` call, like so: `styled('div')`. In fact, the styled.tagname helpers are just aliases of `styled('tagname')`!

#### Third-party components

The above also works perfectly for styling third-party components, like a `react-router` `<Link />`!

```JS
import styled from 'styled-components';
import { Link } from 'react-router';

const StyledLink = styled(Link)`
  color: palevioletred;
  display: block;
  margin: 0.5em 0;
  font-family: Helvetica, Arial, sans-serif;

  &:hover {
    text-decoration: underline;
  }
`;
```

```JSX
<Link to="/">Standard, unstyled Link</Link>
<StyledLink to="/">This Link is styled!</StyledLink>
```

<div align="center">
  <a href="http://www.webpackbin.com/41PeBHU6-">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/JJw4MdX.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

### Keyframes

Keyframes in CSS don't make sense to be scoped to a single component, they are meant to be global. This is why we export a `keyframes` helper which will generate a unique name for your keyframes. You can then use that unique name throughout your app.

This way, you get all the benefits of using JavaScript, are avoiding name clashes and get your keyframes like always:

```JS
// fadeIn.js
import { keyframes } from 'styled-components';

const fadeIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

export default fadeIn;
```

```JSX
import styled from 'styled-components';
import fadeIn from '../fadeIn';

const ComponentThatFadesIn = styled.div`
animation: 1s ease-out ${fadeIn};
`;

export default ComponentThatFadesIn;
```

This component will then have that animation when rendered.

## Docs

See [the documentation](./docs) for more information about using `styled-components`.

### Table of Contents

- [API Reference](./docs/api.md)
- [Tips and Tricks](./docs/tips-and-tricks.md)

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
