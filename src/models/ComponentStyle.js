// @flow
import parse from '../postcss/parse'

import type {RuleSet} from "../types"
import flatten from "../utils/flatten"

/*
  ComponentStyle is all the CSS-specific stuff, not
  the React-specific stuff.
 */
export default class ComponentStyle {
  rules: RuleSet;
  constructor(rules: RuleSet) {
    this.rules = rules
  }

  /*
   * Flattens a rule set into valid CSS
   * Parses the CSS
   * Figures out how to inject it
   * */
  injectStyles(executionContext: Array<any>) {
    const flatCSS = flatten(this.rules, executionContext).join("")
    console.log(flatCSS)
    console.log(parse(flatCSS))
  }
}
