# `babel-plugin-styled-components`

Babel plugin for `styled-components`. This is **only necessary if you're server-side rendering**, you can use `styled-components` perfectly fine without this Babel plugin. (it does give you a nicer debugging experience though)

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

- [Better debugging](#better-debugging)
- [Minification](#minification)
- [Server-side rendering](#server-side-rendering)

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

### Server-side rendering

By adding a unique identifier to every styled component this plugin avoids checksum mismatches due to different class generation on the client and on the server. If you do not use this plugin and try to server-side render `styled-components` React will complain.

If you don't need server-side rendering, you can disable it with the `ssr` option:

```JSON
{
  "plugins": [
    ["styled-components", {
      "ssr": false
    }]
  ]
}
```

## License

Licensed under the MIT License, Copyright © 2016 Vladimir Danchenkov and Maximilian Stoiber.

See [LICENSE.md](./LICENSE.md) for more information.
