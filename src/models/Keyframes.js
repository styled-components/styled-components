// @flow
import ValidRuleSetChild from './ValidRuleSetChild'
import RuleSet from './RuleSet'

export default class MediaQuery extends ValidRuleSetChild {
  name: string;
  keyframes: RuleSet;

  constructor(name: string, keyframes: RuleSet) {
    super()
    this.name = name
    this.keyframes = keyframes
  }
}
