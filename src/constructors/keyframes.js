// @flow
import uuid from 'node-uuid'
import ValidRuleSetChild from '../models/ValidRuleSetChild'
import Keyframes from '../models/Keyframes'
import Root from '../models/Root'
import css from './css'

export default (...rules: Array<typeof ValidRuleSetChild>) => {
  const name = uuid.v4()
  const styleRoot = new Root(css(...rules))
  return new Keyframes(name, styleRoot).getName()
}
