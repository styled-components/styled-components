import ValidRuleSetChild from './ValidRuleSetChild'
import css from "../constructors/css";

export default class DynamicRule extends ValidRuleSetChild {
  constructor(before, func, after) {
    super()

    console.log({before, func: func.toString(), after})
    this.flatten = props => css`\n${before}${func(props) || ''}${after}`.flatten(props)
  }
}
