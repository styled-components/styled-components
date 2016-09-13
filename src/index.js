/* Wrap the base functions in objects and export*/
import * as rules from './rules'

/* Higher-order constructors */
import concat from './constructors/concat'
import css from './constructors/css'
import rule from './constructors/rule'
import simple from './constructors/simple'
import toggle from './constructors/toggle'
import trait from './constructors/trait'
import media from './constructors/media'
import nested from './constructors/nested'
import pseudo from './constructors/pseudo'
import styled from './constructors/styled'

export {
  rule, rules, nested, concat,
  css, simple, toggle, trait, media, pseudo
}

export default styled
