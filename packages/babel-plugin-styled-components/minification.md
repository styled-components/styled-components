# Minification

This babel plugin does two minifications, one is taking all the whitespace and comments out of your CSS and the other is transpiling tagged template literals.

Wait, transpiling tagged template literals? Doesn't Babel do this natively?

## Transpiling tagged template literals

You're currently using Babel to transpile your ES2015 JavaScript to ES5-compliant code. one of your presets (`es2015`/`env`/`latest`) includes the  `babel-plugin-transform-es2015-template-literals` transform to make tagged template literals work in older browsers, but there is a caveat. Output of that plugin is quite wordy. It's done this way to meet specification requirements:

```JS
// processed with babel-preset-latest

var _templateObject = _taggedTemplateLiteral(['width: 100%;'], ['width: 100%;']);
function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }
var Simple = _styledComponents2.default.div(_templateObject);
```   

`styled-components` styling code does not require full spec compatibility. This plugin will transpile template literals attached to styled-component to a slightly different form which still works in older browsers but has a much smaller footprint.

```JS
// processed with babel-preset-latest
// and babel-plugin-styled-components with { transpileTemplateLiterals: true } option

var Simple = _styledComponents2.default.div(['width: 100%;']);
```

Take a note that it will keep other template literals not related to styled-components as is.

```JS
// following will be converted:
styled.div``
keyframe``
css``

// But this will not be converted
`some text`

// In next example outer template literal will be converted because it's attached to component factory,
// but inner template literals will not be touched
styled.div`color: ${ light ? `white` : `black`};`
```

You can disable this feature with `transpileTemplateLiterals` option:

```JSON
{
  "plugins": [
    ["styled-components", {
      "transpileTemplateLiterals": false
    }]
  ]
}
```
