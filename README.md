# Styled components

The best way to style react apps!

```
npm install --save styled-components
```

> Note: If you're not using `npm` as your package manager, aren't using a module bundler or aren't sure about either of those jump to [Alternative Installation Methods](#alternative-installation-methods).

## Usage

This is what the usage of `styled-components` looks like.

### Basic

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

<div align="center">
  <a href="http://www.webpackbin.com/VyQ9AYHpZ">
    <img alt="Screenshot of the above code ran in a browser" src="http://i.imgur.com/wUJpcjY.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

### Passed props

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

Here's what this looks like in the browser, once empty showing the placeholder and once filled in:

<div align="center">
  <a href="http://www.webpackbin.com/EyBu49rab">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/QoQiSui.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

### Adapting based on props

Let's create a button component that has a prop that `primary`, which can be set to `true`

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

Let's render a normal button and a primary button, just like you normally would:

```JSX
<Button>Normal</Button>
<Button primary={true}>Primary</Button>
```

This is what this looks like in the browser:

<div align="center">
  <a href="http://www.webpackbin.com/4JAqcmL6Z">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/4qlEdsx.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

Overriding based on props: done. But there's other way to override styles!

### Overriding component styles

If we go back to our button example, let's get rid of the primary stuff and only ever render the "normal" button:

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

Nothing fancy happening here, just a button.

Let's say someplace else you want to reuse most of the styles, but want to make the color and border color `tomato` instead of `palevioletred`. Instead of factoring out the CSS into a separate function or, dare I say it, copy and pasting the styles, we make this easy!

You can simply use `styled` like a function and pass in the previous component to override some styles, but preserving all the others:

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

When rendered, this is what the `TomatoButton` looks like:

<div align="center">
  <a href="http://www.webpackbin.com/VJZQkBU6Z">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/LZZ3h5i.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

#### Third-party components

Imagine want to style a third-party component, like a `<Link>` from `react-router`. Well, the above works perfectly for that case too!

```JSX
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

render(
  <div>
    <Link to="/">Standard, unstyled Link</Link>
    <br />
    <StyledLink to="/">This Link is styled!</StyledLink>
  </div>,
  document.querySelector('#app')
);
```

<div align="center">
  <a href="http://www.webpackbin.com/41PeBHU6-">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/JJw4MdX.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

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
