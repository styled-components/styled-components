# ES6 Tagged Template Literals

Tagged Template Literals are a new feature in ES6 that lets you define _custom string interpolation_ rules, which is how we're able to create Styled Components.

```js
/* If you have no interpolations, they're the same. */
myFunction` some string here `
/* is equivalent to */
myFunction('some string here')

/* When you use interpolations, a normal template string
   simply calls toString() on each interpolation and joins
   the string together: */
const str = `1 + 2 = ${1 + 2}. Array: ${ [1,2,3] }. Object: ${ { a: 1 } }`
//#> "1 + 2 = 3. Array: 1,2,3. Object: [object Object]"

/* But if you pass this to a template function, you get passed
   all the strings and interpolations and can do whatever you like! */
const myFunction = (...args) => JSON.stringify([...args])
//#> [
//#>   ["1 + 2 = ", ". Array: ", ". Object: ", "" ],
//#>   3,
//#>   [ 1, 2, 3 ],
//#>   { "a": 1 }
//#> ]

/* The variables are passed as follows: */
myFunction( stringChunks, ...interpolations)

/* It's a little annoying to work with but it means that we can turn */
styled.div`
  color: tomato;
  ${ props => props.background || 'white' }
`
/* into an object and re-evaluate it whenever a StyledComponent's
   componentWillReceiveProps lifecycle method is called. Neat hey! */
```

## In Styled Components

Whenever you call ``styled.xyz` ... ` `` the tagged template function underneath is called `css`. You can use it yourself if you ever need a chunk of CSS to work like a styled component, like, in a mixin.

```js
import styled, { css } from 'styled-component'

const chunk = css`
  color: red;
  ${ props => props.background && 'background: white' }
`

const Div = styled.div`
  ${ chunk }
`
```

If you leave off the `css` in `chunk` your function will be `toString()`ed which is not what you want.
