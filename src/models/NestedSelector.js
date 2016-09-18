import ValidRuleSetChild from './ValidRuleSetChild'

export default class NestedSelector extends ValidRuleSetChild {
  constructor(selector, ruleSet) {
    super()
    this.selector = selector
    this.ruleSet = ruleSet
  }

  flatten(context) {
    const { selector } = this
    const { rules, fragments } = this.ruleSet.flatten(context)
    return { selector, rules, fragments }
  }
}
