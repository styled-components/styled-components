// @flow
import NestedSelector from '../models/NestedSelector'
import ValidRuleSetChild from '../models/ValidRuleSetChild'
import concat from './concat'

export default (
  selector: string,
  ...rules: Array<typeof ValidRuleSetChild>
): NestedSelector => new NestedSelector(selector, concat(...rules))
