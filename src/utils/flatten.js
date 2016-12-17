// @flow
import hyphenate from 'fbjs/lib/hyphenateStyleName'
import isPlainObject from 'is-plain-object'

import type { Interpolation } from '../types'

// A list of properties that need a unit other than px appended
// Thanks to jss-default-unit for this list
// https://github.com/cssinjs/jss-default-unit
const nonPixelProperties = {
  'animation-delay': 'ms',
  'animation-duration': 'ms',
  'perspective-origin-x': '%',
  'perspective-origin-y': '%',
  'transform-origin': '%',
  'transform-origin-x': '%',
  'transform-origin-y': '%',
  'transform-origin-z': '%',
  'transition-delay': 'ms',
  'transition-duration': 'ms',
}

const getUnit = (prop: string): string => nonPixelProperties[hyphenate(prop)] || 'px'

export const objToCss = (obj: Object, prevKey?: string): string => {
  const css = Object.keys(obj).map(prop => {
    let value = obj[prop]
    if (isPlainObject(value)) return objToCss(value, prop)
    if (typeof value === 'number') value = `${value}${getUnit(prop)}`
    return `${hyphenate(prop)}: ${value};`
  }).join(' ')
  return prevKey ? `${prevKey} {
  ${css}
}` : css
}

const flatten = (chunks: Array<Interpolation>, executionContext: ?Object): Array<Interpolation> => (
  chunks.reduce((ruleSet: Array<Interpolation>, chunk: ?Interpolation) => {
    /* Remove falsey values */
    if (chunk === undefined || chunk === null || chunk === false || chunk === '') return ruleSet
    /* Flatten ruleSet */
    if (Array.isArray(chunk)) return [...ruleSet, ...flatten(chunk, executionContext)]
    /* Either execute or defer the function */
    if (typeof chunk === 'function') {
      return executionContext
        ? ruleSet.concat(...flatten([chunk(executionContext)], executionContext))
        : ruleSet.concat(chunk)
    }

    /* Handle objects */
    // $FlowIssue have to add %checks somehow to isPlainObject
    return ruleSet.concat(isPlainObject(chunk) ? objToCss(chunk) : chunk.toString())
  }, [])
)

export default flatten
