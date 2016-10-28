// @flow
import hyphenate from 'fbjs/lib/hyphenateStyleName'
import { isPlainObject } from 'lodash'

import type { RuleSet, Interpolation } from '../types'

export const objToCss = (obj: Object): string => (
  Object.keys(obj).map(key => `${hyphenate(key)}: ${obj[key]};`).join(' ')
)

type Chunk = Interpolation | Array<Interpolation>

const flatten = (chunks: RuleSet, executionContext: ?Object): RuleSet => (
  chunks.reduce((ruleSet: Array<?Chunk>, chunk: ?Chunk) => {
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
