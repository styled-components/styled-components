<a href="https://www.styled-components.com">
  <img alt="styled-components" src="https://raw.githubusercontent.com/styled-components/brand/master/styled-components.png" height="150px" />
</a>
<br />

Visual primitives for the component age. Use the best bits of ES6 and CSS to style your apps without stress 💅

```
npm install --save styled-components
```

[![npm](https://img.shields.io/npm/v/styled-components.svg)](https://www.npmjs.com/package/styled-components)
[![Join the community on Spectrum](https://withspectrum.github.io/badge/badge.svg)](https://spectrum.chat/styled-components)

![gzip size](http://img.badgesize.io/https://unpkg.com/styled-components/dist/styled-components.min.js?compression=gzip&label=gzip%20size)
![size](http://img.badgesize.io/https://unpkg.com/styled-components/dist/styled-components.min.js?label=size)
![module formats: umd, cjs, esm](https://img.shields.io/badge/module%20formats-umd%2C%20cjs%2C%20esm-green.svg)

Utilising [tagged template literals](https://www.styled-components.com/docs/advanced#tagged-template-literals) (a recent addition to JavaScript) and the [power of CSS](https://www.styled-components.com/docs/api#supported-css), `styled-components` allows you to write actual CSS code to style your components. It also removes the mapping between components and styles – using components as a low-level styling construct could not be easier!

`styled-components` is compatible with both React (for web) and ReactNative – meaning it's the perfect choice even for truly universal apps! See the [documentation about ReactNative](https://www.styled-components.com/docs/basics#react-native) for more information.

> **Note:** If you're not using `npm` as your package manager, aren't using a module bundler or aren't sure about either of those jump to [Alternative Installation Methods](#alternative-installation-methods).

*Made by [Glen Maddern](https://twitter.com/glenmaddern), [Max Stoiber](https://twitter.com/mxstbr) and [Phil Plückthun](https://twitter.com/_philpl), supported by [Front End Center](https://frontend.center) and [Thinkmill](http://thinkmill.com.au/). Thank you for making this project possible!*

## Docs

**See the documentation at [styled-components.com/docs](https://www.styled-components.com/docs)** for more information about using `styled-components`!

### Quicklinks

Quicklinks to some of the most-visited pages:

- [**Getting started**](https://www.styled-components.com/docs/basics)
- [API Reference](https://styled-components.com/docs/api)
- [Theming](https://www.styled-components.com/docs/advanced#theming)
- [Server-side rendering](https://www.styled-components.com/docs/advanced#server-side-rendering)
- [Tagged Template Literals explained](https://www.styled-components.com/docs/advanced#tagged-template-literals)

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

[**@gandm**](https://github.com/gandm)'s language-babel has been ported to VSCode under the name [Babel JavaScript](https://marketplace.visualstudio.com/items?itemName=mgmcdermott.vscode-language-babel) by [Michael McDermott](https://twitter.com/michaelgmcd). It provides the same all-in-one solution for Babel syntax highlighting with styled-components included.

If you would like to keep your current JavaScript syntax highlighting, you can use the [vscode-styled-components](https://github.com/styled-components/vscode-styled-components) extension to provide styled-components syntax highlighting inside your Javascript files. You can install it as usual from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=jpoissonnier.vscode-styled-components).

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
- [mcs-lite-ui](https://github.com/MCS-Lite/mcs-lite): An on-premises Internet of Things cloud platform, which can be quickly built and get started with. ([demo](http://mcs-lite-ui.netlify.com/))
- [react-progressive-bg-image](https://github.com/evenchange4/react-progressive-bg-image): 🖼 Medium style progressive background image. ([demo](http://react-progressive-bg-image.netlify.com/))
- [react-simple-chatbot](https://github.com/LucasBassetti/react-simple-chatbot): Simple chatbot / conversational-ui React component. ([demo](https://lucasbassetti.com.br/react-simple-chatbot/))
- [react-css-loaders](https://github.com/LucasBassetti/react-css-loaders): A collection of pure CSS React loading components. ([demo](https://lucasbassetti.com.br/react-css-loaders/))
- [Rebass](https://github.com/jxnblk/rebass): Functional React UI component library ([demo](http://jxnblk.com/rebass))

#### Grid Systems
- [grid-styled](https://github.com/jxnblk/grid-styled): Responsive grid system ([demo](http://jxnblk.com/grid-styled/))
- [Hedron](http://github.com/jsbros/hedron): A no-frills flex-box grid system.
- [styled-components-grid](https://github.com/jameslnewell/styled-components-grid): Responsive grid components for `styled-components`.
- [react-styled-flexboxgrid](https://github.com/LoicMahieu/react-styled-flexboxgrid): Grid system based on Flexbox ([demo](https://loicmahieu.github.io/react-styled-flexboxgrid/demo/index.html))
- [react-flexa](https://github.com/aaronvanston/react-flexa): React grid system implementing the flexbox CSS API responsively.
- [griz](https://github.com/josephrexme/griz): The simplest grid system you'd ever see. Using grids with a flexbox fallback.

#### Helpers
- [styled-props](https://github.com/RafalFilipek/styled-props): Simple lib that allows you to set styled props in your styled-components without stress ([demo](http://www.webpackbin.com/N1EKUqgvG))
- [styled-components-breakpoint](https://github.com/jameslnewell/styled-components-breakpoint): Utility function for using breakpoints with `styled-components`.
- [styled-theme](https://github.com/diegohaz/styled-theme): Extensible theming system for styled-components.
- [styled-tools](https://github.com/diegohaz/styled-tools): Useful interpolated functions for styled-components.
- [styled-ax](https://github.com/Lokua/styled-ax): Functional theme property accessor(s)
- [react-create-component-from-tag-prop](https://github.com/jameslnewell/react-create-component-from-tag-prop): Create a react component from a tag prop. Lets your users to choose which HTML elements get styled by your 💅 styled-components.
- [styled-components-theme](https://github.com/erikras/styled-components-theme): A library for refering to theme colors and modifying them inline. e.g. `color: ${primary.lighten(0.3)};`
- [styled-map](https://github.com/scf4/styled-map): Super simple lib to map props to styles with `styled-components`
- [styled-system](https://github.com/jxnblk/styled-system): Design system utilities for styled-components – used in grid-styled and Rebass ([demo](http://jxnblk.com/styled-system/))
- [styled-shortcuts](https://github.com/donavon/styled-shortcuts): Use simple string notation to access props. No functions necessary! Example: `font-size: ${'theme.fontSize:px'};` ([demo](https://codesandbox.io/s/jRE0XxR9v))
- [styled-shortcut-components](https://github.com/donavon/styled-shortcut-components): A convenience package that wraps `styled-components` with `styled-shortcuts`.
- [styled-media-query](http://github.com/morajabi/styled-media-query): Easily and beautifully use media queries with styled-component with custom breakpoints

### Boilerplates
- [react-redux-styled-hot-universal](https://github.com/krasevych/react-redux-styled-hot-universal) (SSR, Universal Webpack, Redux, React-router, Webpack 2, Babel, Styled Components and more...)
- [ARc](https://github.com/diegohaz/arc): Atomic React App boilerplate with styled components ([demo](https://diegohaz.github.io/arc))
- [react-boilerplate](https://github.com/mxstbr/react-boilerplate): A highly scalable, offline-first foundation with the best developer experience and a focus on performance and best practices
- [Scalable React Boilerplate](https://github.com/RyanCCollins/scalable-react-boilerplate)
- [Scalable React TypeScript Boilerplate](https://github.com/RyanCCollins/scalable-react-ts-boilerplate)
- [Superstylin'](https://github.com/bntzio/gatsby-starter-superstylin): A Gatsby starter with styled-components 💅 ([demo](https://superstylin.netlify.com/))

### Websites
- [PostCSS.parts](http://postcss.parts): A searchable catalog of PostCSS plugins
- [spaceexperience.club](https://spaceexperience.club/): Brings you each day a stunning picture of our universe, Astronomy Picture of the Day. ([source](https://github.com/caspg/space-exp))
- [sachagreif.com](http://sachagreif.com): personal homepage built with [Gatsby](https://github.com/gatsbyjs/gatsby) ([source](https://github.com/SachaG/sg2017)).
- [ismaywolff.nl](https://ismaywolff.nl): personal portfolio with serverside rendering ([source](https://github.com/ismay/ismaywolff.nl)).
- [Dirtyredz.com](http://dirtyredz.com): David McClain | Dirtyredz - About me, Latest projects and Contact ([source](https://github.com/dirtyredz/dirtyredz.com))
- [Reactiflux](https://www.reactiflux.com): Reactiflux community home build with [Gatsby](https://github.com/gatsbyjs/gatsby) ([source](https://github.com/reactiflux/reactiflux.com)).
- [michaelhsu.tw](http://michaelhsu.tw): A simple static homepage built with CRA pre-renderer ([source](https://github.com/evenchange4/michaelhsu.tw)).
- [joeireland.com](https://joeireland.com): Portfolio of Joseph Ireland ([source](https://github.com/IamJoseph/JoesReactWebsite)).
- [rosesdaycare.center](https://rosesdaycare.center): Marketing website with theme colors that change on refresh ([source](https://github.com/anthony2025/roses-daycare)).
- [CodeSandbox](https://codesandbox.io/s/new): An online editor tailored for React development ([source](https://github.com/CompuIves/codesandbox-client)).

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
- [🖥 Create a style guide using NPM & styled-components](https://www.youtube.com/watch?v=u6gQ48rSw-E): Jamie fumbles through creating a shareable NPM package.

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

Licensed under the MIT License, Copyright © 2017 Glen Maddern and Maximilian Stoiber.

See [LICENSE](./LICENSE) for more information.

## Acknowledgements

This project builds on a long line of earlier work by clever folks all around the world. We'd like to thank Charlie Somerville, Nik Graf, Sunil Pai, Michael Chan, Andrey Popp, Jed Watson & Andrey Sitnik who contributed ideas, code or inspiration.

Special thanks to [@okonet](https://github.com/okonet) for the fantastic logo.
