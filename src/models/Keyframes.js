// @flow
import ValidRuleSetChild from './ValidRuleSetChild'
import Root from './Root'

export default class Keyframes extends ValidRuleSetChild {
  name: string;
  styleRoot: Root;

  constructor(name: string, styleRoot: Root) {
    super()
    this.name = name
    this.styleRoot = styleRoot
    styleRoot.injectStyles()
  }

  getName(): string {
    return this.name
  }
}
