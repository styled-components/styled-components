import Element from './models/Element'
import Root from "./models/Root";

/* Wrap the base functions in objects and export*/
import * as rules from './rules'
import * as units from './units'

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

/* Two main entry points */

const elem = (...properties) => {
  const [tagName, ...rules] = ensureTagThenStyles(properties)
  return Element(tagName, ...rules)  
}

/* Either ['tagName', ...styles] or [...styles] can be passed in */
const ensureTagThenStyles = list =>
  typeof list[0] === 'string' ? list : ['div'].concat(list)

const generateClassnames = (...rules) => new Root(...rules).injectStyles()

export {
  elem, rule, rules, units, nested, concat,
  css, simple, toggle, trait, media, pseudo
}

export default styled
