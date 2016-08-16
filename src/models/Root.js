import concat from "../constructors/concat"
import {hashObject} from 'aphrodite/lib/util'
import {injectStyleOnce} from 'aphrodite/lib/inject'

/*
 * The root node of a styling tree.
 * */
export default class Root {
  constructor(...rules) {
    this.ruleSet = concat(...rules)
  }

  /* This is aphrodite-specifc but could be changed up */
  injectStyles() {
    const { rules, fragments } = this.ruleSet.flatten()
    const className = '_' + hashObject({ rules, fragments })
    injectCss('.' + className, rules, fragments)
    return className
  }
}

/* Recursive CSS injector */
const injectCss = (selector, rules, fragments) => {
  injectStyleOnce(selector, selector, [rules], false)
  fragments.forEach(fragment => {
    injectCss(joinSelectors(selector, fragment.selector), fragment.rules, fragment.fragments)
  })
}

const joinSelectors = (outer, inner) => outer.split(/\s*,\s*/)
  .map(outerPart => console.log(`"${outer}" — "${outerPart}"`) || (
      /&/.exec(inner) ? inner.replace(/&/g, outerPart) : `${outerPart} ${inner}`
    ).replace(/\s+$/, '')
  ).join(', ')
