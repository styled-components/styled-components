# CSS We Support

Within a styled component, we support all of CSS, including nesting – since we generate an actual stylesheet and not inline styles, whatever works in CSS works in a styled component!

```js
styled.div`
  any: selector;
  something: that needs prefixes; /* will be prefixed */
  &:pseudo-selectors {
    all good;
  }
  @media (min-width: 600px) {
    aint-no: thing;
  }
  > h1 {
    direct-descendants: fine too; /* all descendants work fine too
                                     but not recommended. */
  }
  html.what-about-contextual & {
    sall: good;
  }
`
```

> **Note:** Ampersands (`&`) get replaced by our generated, unique classname for that styled component, making it easy to have complex logic

On top of that you can always use `injectGlobal` for actually global things, like `@font-face`:

```js
import { injectGlobal } from 'styled-components'

injectGlobal`
	@font-face {
	  font-family: 'Operator Mono';
	  src: url('../fonts/Operator-Mono.ttf');
	}
`
```
