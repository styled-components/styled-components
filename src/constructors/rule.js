// @flow
import Rule from '../models/Rule'

export default (property: string, value: string): Rule => new Rule(property, value)
