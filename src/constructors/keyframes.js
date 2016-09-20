// @flow
import concat from './concat'
import ValidRuleSetChild from '../models/ValidRuleSetChild'
import Keyframes from '../models/Keyframes'

export default (name: string, ...rules: Array<typeof ValidRuleSetChild>) => (
  new Keyframes(name, concat(...rules))
)
