// @flow
import hyphenate from 'fbjs/lib/hyphenateStyleName'
import isPlainObject from './isPlainObject'
import isStyledComponent from './isStyledComponent'

import type { Interpolation } from '../types'
import Keyframes from '../models/Keyframes'

export const objToCss = (obj: Object, prevKey?: string): string => {
  const css = Object.keys(obj)
    .filter(key => {
      const chunk = obj[key]
      return (
        chunk !== undefined && chunk !== null && chunk !== false && chunk !== ''
      )
    })
    .map(key => {
      if (isPlainObject(obj[key])) return objToCss(obj[key], key)
      return `${hyphenate(key)}: ${obj[key]};`
    })
    .join(' ')
  return prevKey
    ? `${prevKey} {
  ${css}
}`
    : css
}

const flatten = (
  chunks: Array<Interpolation>,
  executionContext: ?Object,
  styleSheet: ?Object
): Array<Interpolation> =>
  chunks.reduce((ruleSet: Array<Interpolation>, chunk: ?Interpolation) => {
    /* Remove falsey values */
    if (
      chunk === undefined ||
      chunk === null ||
      chunk === false ||
      chunk === ''
    ) {
      return ruleSet
    }

    /* Flatten ruleSet */
    if (Array.isArray(chunk)) {
      ruleSet.push(...flatten(chunk, executionContext, styleSheet))
      return ruleSet
    }

    /* Handle other components */
    if (isStyledComponent(chunk)) {
      // $FlowFixMe not sure how to make this pass
      ruleSet.push(`.${chunk.styledComponentId}`)
      return ruleSet
    }

    /* Either execute or defer the function */
    if (typeof chunk === 'function') {
      if (executionContext) {
        ruleSet.push(
          // $FlowFixMe it's a normal function but flow doesn't get that
          ...flatten([chunk(executionContext)], executionContext, styleSheet)
        )
      } else ruleSet.push(chunk)

      return ruleSet
    }

    if (chunk instanceof Keyframes) {
      if (styleSheet) {
        chunk.inject(styleSheet)
        ruleSet.push(chunk.getName())
      } else ruleSet.push(chunk)

      return ruleSet
    }

    /* Handle objects */
    ruleSet.push(
      // $FlowFixMe have to add %checks somehow to isPlainObject
      isPlainObject(chunk) ? objToCss(chunk) : chunk.toString()
    )

    return ruleSet
  }, [])

export default flatten
