<a href="https://github.com/styled-components/styled-components">
  <img alt="styled-components" src="https://raw.githubusercontent.com/styled-components/brand/master/styled-components.png" height="150px" />
</a>
<br />

Visual primitives for the component age. Use the best bits of ES6 and CSS to style your apps without stress 💅

```
npm install --save styled-components
```

[![npm](https://img.shields.io/npm/v/styled-components.svg)](https://www.npmjs.com/package/styled-components)
[![Travis Build Status](https://travis-ci.org/styled-components/styled-components.svg?branch=master)](https://travis-ci.org/styled-components/styled-components)
[![AppVeyor Build Status](https://ci.appveyor.com/api/projects/status/github/gruntjs/grunt?branch=master&svg=true)](https://ci.appveyor.com/project/mxstbr/styled-components)
[![Supported by Thinkmill](https://thinkmill.github.io/badge/heart.svg)](http://thinkmill.com.au/?utm_source=github&utm_medium=badge&utm_campaign=styled-components)
[![gitter](https://camo.githubusercontent.com/54dc79dc7da6b76b17bc8013342da9b4266d993c/68747470733a2f2f6261646765732e6769747465722e696d2f6d78737462722f72656163742d626f696c6572706c6174652e737667)](https://gitter.im/styled-components/styled-components)

![gzip size](http://img.badgesize.io/https://unpkg.com/styled-components/dist/styled-components.min.js?compression=gzip&label=gzip%20size)
![size](http://img.badgesize.io/https://unpkg.com/styled-components/dist/styled-components.min.js?label=size)
![module formats: umd, cjs, esm](https://img.shields.io/badge/module%20formats-umd%2C%20cjs%2C%20esm-green.svg)

Utilising [tagged template literals](./docs/tagged-template-literals.md) (a recent addition to JavaScript) and the [power of CSS](./docs/css-we-support.md), `styled-components` allows you to write actual CSS code to style your components. It also removes the mapping between components and styles – using components as a low-level styling construct could not be easier!

`styled-components` is compatible with both React (for web) and ReactNative – meaning it's the perfect choice even for truly universal apps! See the [ReactNative section](#react-native) for more information

> **Note:** If you're not using `npm` as your package manager, aren't using a module bundler or aren't sure about either of those jump to [Alternative Installation Methods](#alternative-installation-methods).

*Made by [Glen Maddern](https://twitter.com/glenmaddern) and [Max Stoiber](https://twitter.com/mxstbr), supported by [Front End Center](https://frontend.center) and [Thinkmill](http://thinkmill.com.au/). Thank you for making this project possible!*

## Usage

### Basic

This creates two react components, `<Title>` and `<Wrapper>`:

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
```

*(The CSS rules are automatically vendor prefixed, so you don't have to think about it!)*

You render them like so:

```JSX
// Use them like any other React component – except they're styled!
<Wrapper>
  <Title>Hello World, this is my first styled component!</Title>
</Wrapper>
```

<div align="center">
  <a href="https://www.webpackbin.com/bins/-KeeZCr0xKfutOfOujxN">
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

  &:hover {
    box-shadow: inset 1px 1px 2px rgba(0,0,0,0.1);
  }
`;
```

You can just pass a `placeholder` prop into the `styled-component`. It will pass it on to the DOM node like any other react component:

```JSX
// Render a styled input with a placeholder of "@mxstbr"
<Input placeholder="@mxstbr" type="text" />
```

Here is one input without any content showing the placeholder, and one with some content:

<div align="center">
  <a href="https://www.webpackbin.com/bins/-Kee_EvBIQAeG2pySjbH">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/QoQiSui.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

### Adapting based on props

This is a button component that has a `primary` state. By setting `primary` to `true` when rendering it we adjust the background and text color. *(see [tips and tricks](./docs/tips-and-tricks.md#component-adjustments) for more examples of this pattern!)*

```JSX
import styled from 'styled-components';

const Button = styled.button`
  /* Adapt the colors based on primary prop */
  background: ${props => props.primary ? 'palevioletred' : 'white'};
  color: ${props => props.primary ? 'white' : 'palevioletred'};

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
<Button primary>Primary</Button>
```

<div align="center">
  <a href="https://www.webpackbin.com/bins/-Kee_eVVRWzr06JHcCcQ">
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

Let's say someplace else you want to use your button component, but just in this one case you want the color and border color to be `tomato` instead of `palevioletred`. Now you _could_ pass in an interpolated function and change them based on some props, but that's quite a lot of effort for overriding the styles once.

To do this in an easier way you can call `styled` as a function and pass in the previous component. You style that like any other styled-component. It overrides duplicate styles from the initial component and keeps the others around:

```JSX
// TomatoButton.js

import React from 'react';
import styled from 'styled-components';

import Button from './Button';

const TomatoButton = styled(Button)`
  color: tomato;
  border-color: tomato;
`;

export default TomatoButton;
```

This is what our `TomatoButton` looks like, even though we have only specified the `color` and the `border-color`. Instead of copy and pasting or factoring out the styles into a separate function we've now reused them.

<div align="center">
  <a href="https://www.webpackbin.com/bins/-Keea0VX4gjY70V4Bzc7">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/LZZ3h5i.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

<br />

> **Note:** You can also pass tag names into the `styled()` call, like so: `styled('div')`. In fact, the styled.tagname helpers are just aliases of `styled('tagname')`!

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
  <a href="https://www.webpackbin.com/bins/-KeeaQG9JUQqZa4UYbFv">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/JJw4MdX.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

> **Note:** `styled-components` generate a real stylesheet with classes. The class names are then passed to the react component (including third party components) via the `className` prop. For the styles to be applied, third-party components must attach the passed-in `className` prop to a DOM node. Likewise, third-party react native components must attach the passed in `style` prop. See [Using `styled-components` with existing CSS](./docs/existing-css.md) for more information!

### Animations

CSS animations with `@keyframes` aren't scoped to a single component but you still don't want them to be global. This is why we export a `keyframes` helper which will generate a unique name for your keyframes. You can then use that unique name throughout your app.

This way, you get all the benefits of using JavaScript, are avoiding name clashes and get your keyframes like always:

```JS
import styled, { keyframes } from 'styled-components';

// keyframes returns a unique name based on a hash of the contents of the keyframes
const rotate360 = keyframes`
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
`;

// Here we create a component that will rotate everything we pass in over two seconds
const Rotate = styled.div`
  display: inline-block;
  animation: ${rotate360} 2s linear infinite;
`;
```

This will now rotate it's children over and over again, for example our logo:

```JSX
<Rotate>&lt; 💅 &gt;</Rotate>
```

<div align="center">
  <a href="https://www.webpackbin.com/bins/-Keeb-w-w4oiPbowcT5k">
    <img alt="Animated GIF of the above code ran in a browser" height="100px" src="http://imgur.com/I7Sobjv.gif" />
    <div><em>Live demo</em></div>
  </a>
</div>

### React Native

`styled-components` has a ReactNative mode that works _exactly_ the same, except you import the things from `styled-components/native`:

```JSX
import styled from 'styled-components/native';

const StyledView = styled.View`
  background-color: papayawhip;
`;

const StyledText = styled.Text`
  color: palevioletred;
`;

class MyReactNativeComponent extends React.Component {
  render() {
    return (
      <StyledView>
        <StyledText>Hello World!</StyledText>
      </StyledView>
    )
  }
}
```

We also support more complex styles (like `transform`), which would normally be an array, and shorthands (e.g. for `margin`) thanks to [`css-to-react-native`](https://github.com/styled-components/css-to-react-native)! Imagine how you'd write the property in ReactNative, guess how you'd transfer it to CSS and you're probably right:

```JS
const RotatedBox = styled.View`
  transform: rotate(90deg);
  text-shadow-offset: 10 5;
  font-variant: small-caps;
  margin: 5 7 2;
`
```

> You cannot use the `keyframes` and `injectGlobal` helpers since ReactNative doesn't support keyframes or global styles. We will also log a warning if you use media queries or nesting in your CSS.

### Theming

`styled-components` has full theming support by exporting a wrapper `<ThemeProvider>` component. This component provides a theme to all react components underneath itself in the render tree, even multiple levels deep.

To illustrate this, let's create a component that renders its children with a theme. We do so by wrapping all its children in a `ThemeProvider` that has a `theme`:

```JSX
import { ThemeProvider } from 'styled-components';

const theme = {
  main: 'mediumseagreen',
};

// Create a GreenSection component that renders its children wrapped in
// a ThemeProvider with a green theme
const GreenSection = (props) => {
  return (
    <ThemeProvider theme={theme}>
      {props.children}
    </ThemeProvider>
  );
}
```

Second, let's create a styled component that adapts to the theme.

`styled-components` injects the current theme via `props.theme` into the components, which means you can adapt your component to the theme with interpolated functions.

We'll create a `button` that adapts based on the `main` property of the theme:

```JS
// Button.js
import styled from 'styled-components';

const Button = styled.button`
  /* Color the background and border with theme.main */
  background: ${props => props.theme.main};
  border: 2px solid ${props => props.theme.main};

  /* …more styles here… */
`;
```

Now, when we render the `Button` inside a `GreenSection`, it'll be green!

```JSX
<GreenSection>
  <div>
    {/* Notice how there's no code changes for the button, it just
        adapts to the theme passed from GreenSection! */}
    <Button>Green Button!</Button>
    <div>
      <div>
        {/* This works unlimited levels deep within the component
            tree since we use React's context to pass the theme down. */}
        <Button>Another green button!</Button>
      </div>
    </div>
  </div>
</GreenSection>
```

<div align="center">
  <a href="https://www.webpackbin.com/bins/-KeebSIKWWUhvBDQOG_7">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/XfkzxqV.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

See the [theming doc](./docs/theming.md) for more detailed instructions.

> **Note:** Please make sure you sanitize user input if you accept custom themes from users! See the [security doc](./docs/security.md) for more information.

#### Defaults

The problem with the above code is that if the button is rendered outside a `ThemeProvider`, it won't have any background or border!

There is an easy remedy though. Since `Button` is just a react component we can assign `defaultProps`, which will be used if no theme is provided:

```JS
// Button.js
import styled from 'styled-components';

const Button = styled.button`
  /* Color the background and border with theme.main */
  background: ${props => props.theme.main};
  border: 2px solid ${props => props.theme.main};

  /* …more styles here… */
`;

// Set the default theme, in our case main will be
// palevioletred if no other theme is specified
Button.defaultProps = {
  theme: {
    main: 'palevioletred',
  },
};
```

## Docs

See [the documentation](./docs) for more information about using `styled-components`.

### Table of Contents

- [API Reference](./docs/api.md)
- [Flow Support](./docs/flow-support.md)
- [Tips and Tricks](./docs/tips-and-tricks.md)
- [Tagged Template Literals](./docs/tagged-template-literals.md): How do they work?
- [Using `styled-components` with existing CSS](./docs/existing-css.md): Some edge cases you should be aware of when using `styled-components` with an existing CSS codebase
- [What CSS we support](./docs/css-we-support.md): What parts & extensions of CSS can you use within a component? *(Spoiler: all of CSS plus even more)*
- [Theming](./docs/theming.md): How to work with themes
- [FAQ](./docs/faq.md): Frequently Asked Questions

## Linting

There is (currently experimental) support for `stylelint` – meaning you can take advantage of 150 rules to make sure your `styled-components` CSS is solid!

![Recording of stylelint correctly reporting errors in a styled components' CSS](http://imgur.com/br9zdHb.gif)

See the [`stylelint-processor-styled-components`](https://github.com/styled-components/stylelint-processor-styled-components) repository for installation instructions.

## Syntax highlighting

The one thing you lose when writing CSS in template literals is syntax highlighting. We're working hard on making proper syntax highlighting happening in all editors. We currently have support for Atom, Visual Studio Code, and soon Sublime Text.

This is what it looks like when properly highlighted:

<img alt="Syntax highlighted styled component" src="http://imgur.com/k7h45c3.jpg" height="150px" />

### Atom

[**@gandm**](https://github.com/gandm), the creator of `language-babel`, has added support for `styled-components` in Atom!

To get proper syntax highlighting, all you have to do is install and use the `language-babel` package for your JavaScript files!

### Sublime Text

There is an [open PR](https://github.com/babel/babel-sublime/pull/289) by [@garetmckinley](https://github.com/garetmckinley) to add support for `styled-components` to `babel-sublime`! (if you want the PR to land, feel free to 👍 the initial comment to let the maintainers know there's a need for this!)

As soon as that PR is merged and a new version released, all you'll have to do is install and use `babel-sublime` to highlight your JavaScript files!

### Visual Studio Code

The [vscode-styled-components](https://github.com/styled-components/vscode-styled-components) extension provides syntax highlighting inside your Javascript files. You can install it as usual from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=jpoissonnier.vscode-styled-components).

### VIM / NeoVim
The [`vim-styled-components`](https://github.com/fleischie/vim-styled-components) plugin gives you syntax highlighting inside your Javascript files. Install it with your usual plugin manager like [Plug](https://github.com/junegunn/vim-plug), [Vundle](https://github.com/VundleVim/Vundle.vim), [Pathogen](https://github.com/tpope/vim-pathogen), etc.

Also if you're looking for an awesome javascript syntax package you can never go wrong with [YAJS.vim](https://github.com/othree/yajs.vim).

### Other Editors

We could use your help to get syntax highlighting support to other editors! If you want to start working on syntax highlighting for your editor, open an issue to let us know.

## Built with `styled-components`

### Libraries
- [react-aria-tooltip](https://github.com/egoens/react-aria-tooltip): Simple & accessible ReactJS tooltip component
- [uiGradients](http://jsbros.github.io/uigradients): Generate beautiful background gradients from the [uigradients.com](http://uigradients.com) database.
- [react-enhanced-form](https://github.com/xeonys/react-enhanced-form): The best react form component, on earth 🌍. It makes form inputs easy, finally !
- [react-teleportation](https://github.com/xeonys/react-teleportation): Teleport your components to the foreground.
- [reshake](https://github.com/elrumordelaluz/reshake): CSShake as a React Functional Component ([demo](https://elrumordelaluz.github.io/reshake/))
- [last-draft](https://github.com/vacenz/last-draft): A Draft.js Editor ([demo](http://lastdraft.vace.nz))
- [styled-components-spacing](https://github.com/jameslnewell/styled-components-spacing): Responsive margin and padding components for `styled-components`.
- [reactour](https://github.com/elrumordelaluz/reactour): Tourist Guide into your React Components ([demo](https://elrumordelaluz.github.io/reactour/))

#### Grid Systems
- [grid-styled](https://github.com/jxnblk/grid-styled): Responsive grid system ([demo](http://jxnblk.com/grid-styled/))
- [Hedron](http://github.com/jsbros/hedron): A no-frills flex-box grid system.
- [styled-components-grid](https://github.com/jameslnewell/styled-components-grid): Responsive grid components for `styled-components`.

#### Helpers
- [styled-props](https://github.com/RafalFilipek/styled-props): Simple lib that allows you to set styled props in your styled-components without stress ([demo](http://www.webpackbin.com/N1EKUqgvG))
- [styled-components-breakpoint](https://github.com/jameslnewell/styled-components-breakpoint): Utility function for using breakpoints with `styled-components`.
- [styled-theme](https://github.com/diegohaz/styled-theme): Extensible theming system for styled-components.
- [styled-tools](https://github.com/diegohaz/styled-tools): Useful interpolated functions for styled-components.
- [styled-ax](https://github.com/Lokua/styled-ax): Functional theme property accessor(s)
- [react-create-component-from-tag-prop](https://github.com/jameslnewell/react-create-component-from-tag-prop): Create a react component from a tag prop. Lets your users to choose which HTML elements get styled by your 💅 styled-components.

### Boilerplates
- [react-redux-styled-hot-universal](https://github.com/krasevych/react-redux-styled-hot-universal) (SSR, Universal Webpack, Redux, React-router, Webpack 2, Babel, Styled Components and more...)
- [ARc](https://github.com/diegohaz/arc): Atomic React App boilerplate with styled components ([demo](https://diegohaz.github.io/arc))
- [react-boilerplate](https://github.com/mxstbr/react-boilerplate): A highly scalable, offline-first foundation with the best developer experience and a focus on performance and best practices
- [react-styled-flexboxgrid](https://github.com/LoicMahieu/react-styled-flexboxgrid): Grid system based on Flexbox ([demo](https://loicmahieu.github.io/react-styled-flexboxgrid/demo/index.html))
- [Scalable React Boilerplate](https://github.com/RyanCCollins/scalable-react-boilerplate)
- [Scalable React TypeScript Boilerplate](https://github.com/RyanCCollins/scalable-react-ts-boilerplate)
- [Superstylin'](https://github.com/bntzio/gatsby-starter-superstylin): A Gatsby starter with styled-components 💅 ([demo](https://superstylin.netlify.com/))

### Websites
- [PostCSS.parts](http://postcss.parts): A searchable catalog of PostCSS plugins
- [spaceexperience.club](https://spaceexperience.club/): Brings you each day a stunning picture of our universe, Astronomy Picture of the Day. ([source](https://github.com/caspg/space-exp))
- [sachagreif.com](http://sachagreif.com): personal homepage built with [Gatsby](https://github.com/gatsbyjs/gatsby) ([source](https://github.com/SachaG/sg2017)).
- [Dirtyredz.com](http://dirtyredz.com): David McClain | Dirtyredz - About me, Latest projects and Contact ([source](https://github.com/dirtyredz/dirtyredz.com))
- [Reactiflux](https://www.reactiflux.com): Reactiflux community home build with [Gatsby](https://github.com/gatsbyjs/gatsby) ([source](https://github.com/reactiflux/reactiflux.com)).

### Other
- [react-presents](https://bvaughn.github.io/react-presents/): Highly customizable React slideshow framework with syntaxt highlighting and mobile support.
- [react-adminlte-dash](https://github.com/zksailor534/react-adminlte-dash): AdminLTE dashboard components in React ([demo](http://zksailor534.github.io/react-adminlte-dash))
- [colors-show](https://github.com/RafalFilipek/colors-show): Present your application colors with style. ([demo](https://colors-show.now.sh/))

*Built something with `styled-components`? Submit a PR and add it to this list!*

## Further Reading

These are some great articles and talks about related topics in case you're hungry for more:

- [📝 "Scale" FUD and Style Components](https://medium.com/learnreact/scale-fud-and-style-components-c0ce87ec9772#.kzjba8lcg): Using components as low-level styling constructs
- [🎙 The Future of Reusable CSS](https://www.youtube.com/watch?v=XR6eM_5pAb0): How component libraries should be styled, and why they're not yet
- [📝 Rendering Khan Academy’s Learn Menu Wherever I Please](https://medium.com/@jdan/rendering-khan-academys-learn-menu-wherever-i-please-4b58d4a9432d#.w9nshye05): Documenting the move from the handlebars + less combo to react and inline styles
- [🖥 Ryan's random thoughts about inline styles](https://www.youtube.com/watch?v=EkPcGS4TzdQ): Explaining some benefits of using styles in js

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

## Other solutions

If `styled-components` isn't quite what you're looking for, maybe something in this list is:

- [`glamorous`](https://github.com/paypal/glamorous) - basically `styled-components` but using JS objects and functions instead of strings.

## License

Licensed under the MIT License, Copyright © 2016 Glen Maddern and Maximilian Stoiber.

See [LICENSE](./LICENSE) for more information.

## Acknowledgements

This project builds on a long line of earlier work by clever folks all around the world. We'd like to thank Charlie Somerville, Nik Graf, Sunil Pai, Michael Chan, Andrey Popp, Jed Watson & Andrey Sitnik who contributed ideas, code or inspiration.

Special thanks to [@okonet](https://github.com/okonet) for the fantastic logo.
