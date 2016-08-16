import ValidRuleSetChild from "./ValidRuleSetChild";

export default class NestedSelector extends ValidRuleSetChild {
  constructor(selector, ruleSet) {
    super()
    this.selector = selector
    this.ruleSet = ruleSet
  }

  flatten() {
    const { selector } = this
    const { rules, fragments } = this.ruleSet.flatten()
    return { selector, rules, fragments }
  }
}
