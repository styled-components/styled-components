// @flow
import ValidRuleSetChild from './ValidRuleSetChild'
import type RuleSet, { FlatRuleSetType } from './RuleSet'

export default class NestedSelector extends ValidRuleSetChild {
  selector: string;
  ruleSet: RuleSet;

  constructor(selector: string, ruleSet: RuleSet) {
    super()
    this.selector = selector
    this.ruleSet = ruleSet
  }

  flatten(): FlatRuleSetType {
    const { selector } = this
    const { rules, fragments } = this.ruleSet.flatten()
    return { selector, rules, fragments }
  }
}
