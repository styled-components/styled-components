// @flow
import { hashObject } from 'aphrodite/lib/util'
import { injectStyleOnce } from 'aphrodite/lib/inject'
import concat from '../constructors/concat'
import ValidRuleSetChild from './ValidRuleSetChild'
import type RuleSet, { FragmentType } from './RuleSet'
import joinSelectors from "../utils/joinSelectors"

/* Recursive CSS injector */
const injectCss = (
  selector: string,
  rules: Array<ValidRuleSetChild>,
  fragments: Array<FragmentType>
) => {
  injectStyleOnce(selector, selector, [rules], false)
  fragments.forEach((fragment) => {
    injectCss(joinSelectors(selector, fragment.selector), fragment.rules, fragment.fragments)
  })
}

/*
 * The root node of a styling tree.
 * */
export default class Root {
  ruleSet: RuleSet;

  constructor(...rules: Array<typeof ValidRuleSetChild>) {
    this.ruleSet = concat(...rules)
  }

  /* This is aphrodite-specifc but could be changed up */
  injectStyles(): string {
    const { rules, fragments } = this.ruleSet.flatten()
    const className = `_${hashObject({ rules, fragments })}`
    injectCss(`.${className}`, rules, fragments)
    return className
  }
}
