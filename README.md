<a href="https://www.styled-components.com">
  <img alt="styled-components" src="https://raw.githubusercontent.com/styled-components/brand/master/styled-components.png" height="150px" />
</a>
<br />

Visual primitives for the component age. Use the best bits of ES6 and CSS to style your apps without stress 💅

```
npm i styled-components
```
```
yarn add styled-components
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

The one thing you lose when writing CSS in template literals is syntax highlighting. We're working hard on making proper syntax highlighting happening in all editors. We currently have support for Atom, Visual Studio Code, WebStorm, and soon Sublime Text.

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

### WebStorm, IntelliJ IDEA, PhpStorm, PyCharm, and RubyMine

The [`webstorm-styled-components`](https://github.com/styled-components/webstorm-styled-components) plugin adds code completion and highlighting for CSS properties and values in the template strings. And it also provides code completion and navigation for JavaScript symbols in the interpolations. You can install it from the IDE: go to `Preferences | Plugins` and search for `Styled Components`.

### Other Editors

We could use your help to get syntax highlighting support to other editors! If you want to start working on syntax highlighting for your editor, open an issue to let us know.

## Code completions and error reporting

Along with syntax highlighting, you can install the [TypeScript styled plugin](https://github.com/Microsoft/typescript-styled-plugin) to get error reporting and code completion for styled components in your editor. The plugin supports styled components in both JavaScript and TypeScript files, and works in Visual Studio Code, Sublime, and Atom.

## Built with `styled-components`

A lot of hard work goes into community libraries, projects, and guides. A lot of them make it easier to get started or help you with your next project! There’s also a whole lot of interesting apps and sites that people have built using styled-components.

Make sure to head over to [awesome-styled-components](https://github.com/styled-components/awesome-styled-components) to see them all! And please contribute and add your own work to the list so others can find it.

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
