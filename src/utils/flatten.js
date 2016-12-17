// @flow
import hyphenate from 'fbjs/lib/hyphenateStyleName'
import isPlainObject from 'is-plain-object'

import type { Interpolation } from '../types'

const nonPixelProperties = {
  // A list of properties that need a unit other than px appended
  // Taken from jss-default-unit
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
const unitlessProperties = [
  // CSS properties which accept numbers but are not in units of "px".
  // Taken from aphrodite, who took it from React's CSSProperty.js
  'animation-iteration-count',
  'border-image-outset',
  'border-image-slice',
  'border-image-width',
  'box-flex',
  'box-flex-group',
  'box-ordinal-group',
  'column-count',
  'flex',
  'flex-grow',
  'flex-positive',
  'flex-shrink',
  'flex-negative',
  'flex-order',
  'grid-row',
  'grid-column',
  'font-weight',
  'line-clamp',
  'line-height',
  'opacity',
  'order',
  'orphans',
  'tab-size',
  'widows',
  'z-index',
  'zoom',
  'fill-opacity',
  'flood-opacity',
  'stop-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
]

const getUnit = (prop: string): string => nonPixelProperties[prop] || 'px'

export const objToCss = (obj: Object, prevKey?: string): string => {
  const css = Object.keys(obj).map(originalProp => {
    let value = obj[originalProp]
    const cssProp = hyphenate(originalProp)
    if (isPlainObject(value)) return objToCss(value, cssProp)
    if (typeof value === 'number' && unitlessProperties.indexOf(cssProp) === -1) value = `${value}${getUnit(cssProp)}`
    return `${cssProp}: ${value};`
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
