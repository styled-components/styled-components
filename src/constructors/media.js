// @flow
import concat from './concat'
import MediaQuery from '../models/MediaQuery'
import ValidRuleSetChild from '../models/ValidRuleSetChild'

export default (query: string, ...rules: Array<typeof ValidRuleSetChild>) => (
  new MediaQuery(query, concat(...rules))
)
