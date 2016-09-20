// @flow
import ValidRuleSetChild from './ValidRuleSetChild'
import type RuleSet, { FlatRuleSetType } from './RuleSet'

export default class MediaQuery extends ValidRuleSetChild {
  query: string;
  ruleSet: RuleSet;

  constructor(query: string, ruleSet: RuleSet) {
    super()
    this.query = query
    this.ruleSet = ruleSet
  }

  /* Wrap the media query in brackets if needed. */
  fullQuery(): string {
    return `@media ${(/^\(|\)$/.exec(this.query) ? this.query : `(${this.query})`)}`
  }

  /* No nesting! */
  flatten(): FlatRuleSetType {
    const { rules, fragments } = this.ruleSet.flatten()
    if (fragments.length > 0) console.error("Fragments aren't supported in Media Queries yet")
    return rules
  }
}
