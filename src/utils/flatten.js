// @flow
import hyphenate from 'fbjs/lib/hyphenateStyleName'
import isPlainObject from 'is-plain-object'

import type { Interpolation } from '../types'

export const objToCss = (obj: Object, prevKey?: string): string => {
  let css = ''

  // eslint-disable-next-line guard-for-in, no-restricted-syntax
  for (const key in obj) {
    const chunk = obj[key]
    if (chunk !== undefined && chunk !== null && chunk !== false && chunk !== '') {
      const cssChunk = isPlainObject(chunk)
        ? objToCss(chunk, key)
        : `${hyphenate(key)}: ${chunk};`

      if (cssChunk.length > 0) {
        if (css.length > 0) {
          css += ' '
        }

        css += cssChunk
      }
    }
  }

  return prevKey ? `${prevKey} {
  ${css}
}` : css
}

const innerFlatten = (
  targetChunks: Array<Interpolation>,
  chunk: Interpolation,
  executionContext: ?Object,
) => {
  // State-machine for updating rules. We should put typeof checks directly
  // in the conditional and heavily rely on usage of if/else-if/else to
  // better work with V8's branch prediction
  // https://jsperf.com/typeof-perf-caching
  if (chunk === undefined || chunk === null || chunk === false || chunk === '') {
    // Nothing to do
  } else if (typeof chunk === 'string') {
    targetChunks.push(chunk)
  } else if (typeof chunk === 'number') {
    targetChunks.push(chunk.toString())
  } else if (Array.isArray(chunk)) {
    for (let i = 0; i < chunk.length; i += 1) {
      innerFlatten(targetChunks, chunk[i], executionContext)
    }
  } else if (chunk.hasOwnProperty('styledComponentId')) {
    targetChunks.push(`.${chunk.styledComponentId}`)
  } else if (typeof chunk === 'function') {
    if (executionContext) {
      innerFlatten(targetChunks, chunk(executionContext), executionContext)
    } else {
      // defer the execution context, e.g. `css` styles
      targetChunks.push(chunk)
    }
  } else if (isPlainObject(chunk)) {
    targetChunks.push(objToCss(chunk))
  } else {
    // all else fails, just add it, and to string it
    targetChunks.push(chunk.toString())
    /* flow-enabled */
  }
}

const flatten = (chunks: Array<Interpolation>, executionContext: ?Object): Array<Interpolation> => {
  const resultChunks: Array<Interpolation> = []
  for (let i = 0; i < chunks.length; i += 1) {
    innerFlatten(resultChunks, chunks[i], executionContext)
  }

  return resultChunks
}

export default flatten
