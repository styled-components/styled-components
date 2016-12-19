# `babel-plugin-styled-components`

Babel plugin for `styled-components`. This is **not necessary at all to use `styled-components`**, it just adds some nice features to enhance the experience.

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

### Add `displayNames` to your components

By showing your components' real name in the React DevTools it's much easier to debug your applications.

We take the name of the variable you assign your `styled-components` to and add it as the `displayName` to the resulting React component.

```JS
const MyBtn = styled.button``;
// Plugin does this for you:
MyBtn.displayName = 'MyBtn';
```

When rendering this button, the React DevTools will normally just show `<styled.button>`. By enabling this plugin, the DevTools show `<MyBtn />`.

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

### Add server-side rendering support

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

### Minify styles

By default, plugin minifies styles in template literals. This operation may potentially break your styles in some rare cases, so we recommend to keep this option enabled in development if it's enabled in the production build. You will not see the effect of minification in generated style tags, it solely affects the presentation of styles inside js code.

You can disable minification if you don't need it with minify option:

```JSON
{
  "plugins": [
    ["styled-components", {
      "minify": false
    }]
  ]
}
```

## License

Licensed under the MIT License, Copyright © 2016 Vladimir Danchenkov and Maximilian Stoiber.

See [LICENSE.md](./LICENSE.md) for more information.
