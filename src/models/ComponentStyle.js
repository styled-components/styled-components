// @flow
import parse from '../postcss/parse'
import postcssNested from '../postcss/postcss-nested'
import { hashObject } from 'aphrodite/lib/util'
import {StyleSheet }from 'glamor/lib/sheet'
let styleSheet

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
    if (!styleSheet) (styleSheet = new StyleSheet()) && styleSheet.inject()
    const flatCSS = flatten(this.rules, executionContext).join("")
    console.log(flatCSS)
    const hash = '_' + hashObject(flatCSS)
    console.log(hash)
    const root = parse(`.${hash} { ${ flatCSS } }`);
    console.log(root)
    postcssNested(root)
    const result = root.toResult().css;
    console.log(result)
    styleSheet.insert(result)
    return hash

    /* Thoughts. I don't need to follow the existing implementation with
    * rules and fragments because i can start injecting styles directly.
    * We can simply hash the entire string as it comes through at this point.
    * Then... maybe we use postcss nested on it and wrap it all in .hash {} */
    // const rules = {}
    // const fragments = []
    // root.each(node => {
    //   if (node.type === 'decl') {
    //     rules[camelizeStyleName(node.prop)] = node.value;
    //   } else if (node.type === 'rule') {
    //
    //   }
    // })
    // console.log(rules)
    // console.log(fragments)
  }
}
