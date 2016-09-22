// @flow
import type { RuleSet, Interpolation } from '../types'

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
  [name: string]: Interpolation | RuleSet
}

export default (name: string, options: Options): Function => (valueString: string = ''): RuleSet => {
  const throwUnknown = (unknownValue: string) => {
    const validValues = Object.keys(options).filter(v => v !== 'default')
    throw new Error(`${name}: Unknown value '${unknownValue}'. Valid values are:\n${validValues.join('\n')}`)
  }

  const values = valueString.split(/ +/).filter(s => s.length > 0)
  return (options.default ? [options.default] : [])
    .concat(...values.map(v => (v in options) ? options[v] : throwUnknown(v)))
    .concat('').join('; ')
}
