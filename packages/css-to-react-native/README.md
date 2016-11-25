# css-to-react-native

Converts CSS text to a React Native stylesheet object.

```css
font-size: 18;
line-height: 24;
color: red;
```

```js
{
  fontSize: 18,
  lineHeight: 24,
  color: 'red',
}
```

Converts all number-like values to numbers, and string-like to strings.

Automatically converts indirect values to their React Native equivalents.

```css
text-shadow-offset: 10 5;
font-variant: small-caps;
transform: translate(10, 5) scale(5);
```

```js
{
  textShadowOffset: { width: 10, height: 5 },
  fontVariant: ['small-caps'],
  // Fixes backwards transform order
  transform: [
    { translateY: 10 },
    { translateX: 10 },
    { scale: 5 },
  ]
}
```

Also allows shorthand values.

```css
font: bold 14/16 "Helvetica";
margin: 5 7 2;
```

```js
{
  fontFamily: 'Helvetica',
  fontSize: 14,
  fontWeight: 'bold',
  fontStyle: 'normal',
  fontVariant: [],
  lineHeight: 16,
  marginTop: 5,
  marginRight: 7,
  marginBottom: 2,
  marginLeft: 7,
}
```

Shorthands will only accept values that are supported in React, so `background` will only accept a colour, `backgroundColor`

#### Shorthand Notes

`border{Top,Right,Bottom,Left}` shorthands are not supported, because `borderStyle` cannot be applied to individual border sides.

`flex` does not support putting `flexBasis` before `flexGrow`. The supported syntax is `flex: <flex-grow> <flex-shrink> <flex-basis>`.

# API

The API is mostly for implementors. However, the main API may be useful for non-impmentors. The main API is,

```js
import transform from 'css-to-react-native';
// or const transform = require('css-to-react-native').default;

transform([
  ['font', 'bold 14/16 "Helvetica"'],
  ['margin', '5 7 2'],
  ['border-left-width', '5'],
]); // => { fontFamily: 'Helvetica', ... }
```

For implementors, there is also,

```js
import { getPropertyName, getStylesForProperty } from 'css-to-react-native';

getPropertyName('border-width'); // => 'borderWidth'
getStylesForProperty('borderWidth', '1 0 2 0'); // => { borderTopWidth: 1, ... }
```

Should you wish to opt-out of transforming certain shorthands, an array of property names in camelCase can be passed as a second argument to `transform`.

```js
transform([['border-radius', '50']], ['borderRadius']);
// { borderRadius: 50 } rather than { borderTopLeft: ... }
```

## License

Licensed under the MIT License, Copyright © 2016 Jacob Parker and Maximilian Stoiber.

See [LICENSE.md](./LICENSE.md) for more information.
