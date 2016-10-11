# CSS We Support

Within a Styled Component, we support quite a lot of CSS, plus nesting like Sass:

```js
styled.div`
  any: selector;
  something: that needs prefixes; /* will be prefixed */
  &:pseudo-selectors {
    all good;
  }
  > h1 {
    direct-descendants: fine too; /* all descendants work fine too
                                     but not recommended. */
  }
  @media (min-width: 600px) {
    aint-no: thing;
  }
  html.what-about-contextual & {
    sall: good;
  }
`
```

If you want something else, you can always use `injectGlobal`

```js
import { injectGlobal } from 'styled-components'

injectGlobal`
	@font-face {
	  font-family: 'Operator Mono';
	  src: url('../fonts/Operator-Mono.ttf');
	}
`
```

