# babel-plugin-styled-components-named

Add display names to styled-components

```jsx
const Button = styled.button` width: 100px; `
```
By default looks like `<styled.button/>` in react dev tools. This plugin names it `<Button/>`.

Supported cases for now:

```jsx
const A = styled.div` color: red; `

let B = styled(OtherComponent).div` color: red; `

let C
C = styled.div` color: red; `

const styles = { D: styled.div` color: red; ` }
```

## Installation

```sh
npm install -D babel-plugin-styled-components-named
```

## Usage

### Via `.babelrc`

**.babelrc**

```json
{
  "plugins": ["styled-components-named"]
}
```
