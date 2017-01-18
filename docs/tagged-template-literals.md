# ES6 Tagged Template Literals

**For an alternate explanation see @mxstbr's blog post: [The magic behind :nail_care: styled-components](http://mxstbr.blog/2016/11/styled-components-magic-explained/)**

Tagged Template Literals are a new feature in ES6 that lets you define _custom string interpolation_ rules, which is how we're able to create styled components.

If you have no interpolations, they're the same. This:

```js
myFunction`some string here`
```

is equivalent to this:

```js
myFunction('some string here')
```

When you use interpolations, a normal template string simply calls toString() on each interpolation and joins the string together:

```js
const str = `1 + 2 = ${1 + 2}. Array: ${ [1,2,3] }. Object: ${ { a: 1 } }`
//#> "1 + 2 = 3. Array: 1,2,3. Object: [object Object]"
```

But if you pass this to a template function, you get passed all the strings and interpolations and can do whatever you like!

```js
const myFunction = (...args) => JSON.stringify([...args])
myFunction`1 + 2 = ${1 + 2}. Array: ${ [1,2,3] }. Object: ${ { a: 1 } }`
//#> [
//#>   ["1 + 2 = ", ". Array: ", ". Object: ", "" ],
//#>   3,
//#>   [ 1, 2, 3 ],
//#>   { "a": 1 }
//#> ]
```

The string chunks and interpolations are passed as follows:

```js
myFunction( stringChunks, ...interpolations)
```

It's a little annoying to work with but it means that we can turn

```js
styled.div`
  color: tomato;
  ${ props => props.background}
`
```
into an object and re-evaluate it whenever a StyledComponent's componentWillReceiveProps lifecycle method is called. Neat hey!

## In Styled Components

Whenever you call ``styled.xyz` ... ` ``, underneath we call `css` with the CSS code. You can use `css` yourself if you ever need a chunk of CSS to work like a styled component: (kind of like a mixin!)

```js
import styled, { css } from 'styled-components'

const chunk = css`
  color: red;
  ${ props => props.background && 'background: white' }
`

const Div = styled.div`
  ${ chunk }
`
```

If you leave off the `css` in `chunk` your function will be `toString()`ed and you'll not get the results you expected.
