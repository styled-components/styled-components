import concat from './concat'

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

export default (name, options) => (valueString = '') => {
  const throwUnknown = (unknownValue) => {
    const validValues = Object.keys(options).filter(v => v !== 'default')
    throw new Error(`${name}: Unknown value '${unknownValue}'. Valid values are:\n${validValues.join('\n')}`)
  }

  const values = valueString.split(/ +/).filter(s => s.length > 0)
  return concat(options.default, ...values.map(
    // eslint-disable-next-line no-confusing-arrow
    v => (v in options) ? options[v] : throwUnknown(v)
  ))
}
