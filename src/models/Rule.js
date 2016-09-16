// @flow
import ValidRuleSetChild from './ValidRuleSetChild'
/*
* Basic leaf node of a style tree
* */

export default class Rule extends ValidRuleSetChild {
  property: string;
  value: string;

  constructor(property: string, value: string) {
    super()
    this.property = property
    this.value = value
  }
}
