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

### Transpile template literals

Template literals are not supported yet by some browsers. You'll probably transpile your code with `babel-plugin-transform-es2015-template-literals` to make it work in older browsers, but there is one tiny caveat. Output of that plugin is quite wordy. It's done this way to meet specification requirements.

```JS
// processed with babel-preset-latest

var _templateObject = _taggedTemplateLiteral(['width: 100%;'], ['width: 100%;']);
function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }
var Simple = _styledComponents2.default.div(_templateObject);
```   

Styled-components do not require full spec compatibility. So, if you are going to support older browsers and at the same time care about bundle size, this plugin can step in and transpile template literals attached to styled-component to something with smaller footprint. It will save you a few bytes. Take a note that it will keep other template literals as is.

```JS
// processed with babel-preset-latest
// and babel-plugin-styled-components with { transpileTemplateLiterals: true } option

var Simple = _styledComponents2.default.div(['width: 100%;']);
```

This feature is disable by default. You can enable it with `transpileTemplateLiterals` option:

```JSON
{
  "plugins": [
    ["styled-components", {
      "transpileTemplateLiterals": true
    }]
  ]
}
```

## License

Licensed under the MIT License, Copyright © 2016 Vladimir Danchenkov and Maximilian Stoiber.

See [LICENSE.md](./LICENSE.md) for more information.
