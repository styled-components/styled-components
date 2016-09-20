// @flow
import concat from './concat'
import ValidRuleSetChild from '../models/ValidRuleSetChild'
import RuleSet from '../models/RuleSet'

/*
* Toggle: Simple Namespaced styling
*
* example: flex = toggle('flex', {
*   default: rules.display('flex'), // always included
*   inline: rules.display('inline-flex'),
*   vertical: rules.flexDirection('column'),
* })
*
* flex() => `display: flex;`
* flex('inline vertical') => `display: flex; display: inline-flex; flex-direction: column;`
* */

type Options = {
  [name: string]: typeof RuleSet|typeof ValidRuleSetChild,
}

export default (name: string, options: Options): Function => (valueString: string = ''): concat => {
  const throwUnknown = (unknownValue: string) => {
    const validValues = Object.keys(options).filter(v => v !== 'default')
    throw new Error(`${name}: Unknown value '${unknownValue}'. Valid values are:\n${validValues.join('\n')}`)
  }

  const values = valueString.split(/ +/).filter(s => s.length > 0)
  return concat(options.default, ...values.map(
    // eslint-disable-next-line no-confusing-arrow
    v => (v in options) ? options[v] : throwUnknown(v)
  ))
}
