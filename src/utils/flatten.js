// @flow
import hyphenate from 'fbjs/lib/hyphenateStyleName'
import isPlainObject from 'lodash/isPlainObject'

import type { RuleSet, Interpolation } from '../types'

export const objToCss = (obj: Object): string => (
  Object.keys(obj).map(k => `${hyphenate(k)}: ${obj[k]};`).join(' ')
)

const flatten = (chunks: RuleSet, executionContext: ?Object) : RuleSet => (
  chunks.reduce((array, chunk: Interpolation) => {
    /* Remove falsey values */
    if (chunk === undefined || chunk === null || chunk === false || chunk === '') return array
    /* Flatten arrays */
    if (Array.isArray(chunk)) return array.concat(...flatten(chunk, executionContext))
    /* Either execute or defer the function */
    if (typeof chunk === 'function') {
      return executionContext
        ? array.concat(...flatten([chunk(executionContext)], executionContext))
        : array.concat(chunk)
    }
    /* Handle objects */
    return array.concat(isPlainObject(chunk) ? objToCss(chunk) : chunk.toString())
  }, [])
)

export default flatten
