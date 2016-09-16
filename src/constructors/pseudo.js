// @flow
import nested from './nested'
import ValidRuleSetChild from '../models/ValidRuleSetChild'

export default (pseudo:string, ...rules: Array<typeof ValidRuleSetChild>): nested =>
  nested(pseudo.split(/,\s?/).map(p => `&:${p}`).join(','), ...rules)
