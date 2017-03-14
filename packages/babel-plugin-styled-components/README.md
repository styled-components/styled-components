# `babel-plugin-styled-components`

This plugin adds support for server-side rendering, for minification of styles and gives you a nicer debugging experience when using `styled-components`.

**⚠️ This plugin is only necessary if you're server-side rendering, you can use `styled-components` perfectly fine without it! ⚠️**

## Usage

**THIS ISN'T PUBLISHED YET, WIP**

```
npm install --save-dev babel-plugin-styled-components
```

Then in your babel configuration (probably `.babelrc`):

```JSON
{
  "plugins": ["styled-components"]
}
```

## Features

- [Server-side rendering](#server-side-rendering)
- [Better debugging](#better-debugging)
- [Minification](#minification)

### Server-side rendering

**This option is turned off by default**

By adding a unique identifier to every styled component this plugin avoids checksum mismatches due to different class generation on the client and on the server. If you do not use this plugin and try to server-side render `styled-components` React will complain.

If you want server-side rendering support you can enable it with the `ssr` option:

```JSON
{
  "plugins": [
    ["styled-components", {
      "ssr": true
    }]
  ]
}
```

### Better debugging

This babel plugin adds the components' name to the class name attached to the DOM node. In your browsers DevTools you'll see `<button class="sc-Button-asdf123 asdf123" />` instead of just `<button class="asdf123" />`.

This also adds support for showing your components' real name in the React DevTools. Tget will normally show `<styled.button>` for all of your components, but with this pluginthey show `<MyButton />`.

This makes it easier to find your components and to figure out where they live in your app.

If you don't need this feature, you can disable it with the `displayName` option:

```JSON
{
  "plugins": [
    ["styled-components", {
      "displayName": false
    }]
  ]
}
```

### Preprocessing (Experimental ⚠️ )

This plugin preprocesses your styles with stylis and uses the `no-parser.js` entrypoint on styled-components.

This effectively removes stylis from your runtime bundle and should slightly improve runtime performance and shrink your bundle size.

It automatically disables the `minify` option, since stylis already does some minifcation on your CSS.

> This is experimental and we don't yet know of all limitations and bugs! Consider this non-production ready for now.

You can enable preprocessing with the `preprocess` option:

```JSON
{
  "plugins": [
    ["styled-components", {
      "preprocess": true
    }]
  ]
}
```

### Minification

This plugin minifies your styles in the tagged template literals, giving you big bundle size savings. (note that you will not see the effect of minification in generated `<style>` tags, it solely affects the style strings inside your JS bundle)

> This operation may potentially break your styles in some rare cases, so we recommend to keep this option enabled in development if it's enabled in the production build.

You can disable minification with the `minify` option:

```JSON
{
  "plugins": [
    ["styled-components", {
      "minify": false
    }]
  ]
}
```

We also transpile `styled-components` tagged template literals down to a smaller representation than what Babel normally does, because `styled-components` template literals don't need to be 100% spec compliant. (see [`minification.md`](minification.md) for more information about that) You can use the `transpileTemplateLiterals` option to turn this feature off.

## License

Licensed under the MIT License, Copyright © 2016 Vladimir Danchenkov and Maximilian Stoiber.

See [LICENSE.md](./LICENSE.md) for more information.
