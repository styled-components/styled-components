import ValidRuleSetChild from "./ValidRuleSetChild";
/*
* Basic leaf node of a style tree
* */

export default class Rule extends ValidRuleSetChild {
  constructor(property, value) {
    super()
    this.property = property
    this.value = value
  }
}
