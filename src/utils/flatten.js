// @flow
import hyphenate from 'fbjs/lib/hyphenateStyleName'
import React from 'react'
import isPlainObject from './isPlainObject'
import StyledError from './error'
import type { Interpolation } from '../types'

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
  executionContext: ?Object
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
      ruleSet.push(...flatten(chunk, executionContext))
      return ruleSet
    }

    /* Handle other components */
    if (chunk.hasOwnProperty('styledComponentId')) {
      // $FlowFixMe not sure how to make this pass
      ruleSet.push(`.${chunk.styledComponentId}`)
      return ruleSet
    }

    /* Either execute or defer the function */
    if (typeof chunk === 'function') {
      if (executionContext) {
        const nextChunk = chunk(executionContext)
        /* Throw if a React Element was given styles */
        if (React.isValidElement(nextChunk)) {
          const elementName = chunk.displayName || chunk.name
          throw new StyledError(11, elementName)
        }
        ruleSet.push(...flatten([nextChunk], executionContext))
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
