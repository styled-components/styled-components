# babel-plugin-styled-components-named

Add display names to styled components

## Example

**In**

```js
// input code
```

**Out**

```js
"use strict";

// output code
```

## Installation

```sh
$ npm install babel-plugin-styled-components-named
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["styled-components-named"]
}
```

### Via CLI

```sh
$ babel --plugins styled-components-named script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["styled-components-named"]
});
```
