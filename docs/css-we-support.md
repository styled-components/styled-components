# CSS We Support

Within a styled component, we support quite a lot of CSS: (including nesting)

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

> **Note:** Essentially, all ampersands (`&`) get replaced by our generated, unique classname

On top of that you can always use `injectGlobal` for actually global things like `@font-face`:

```js
import { injectGlobal } from 'styled-components'

injectGlobal`
	@font-face {
	  font-family: 'Operator Mono';
	  src: url('../fonts/Operator-Mono.ttf');
	}
`
```
