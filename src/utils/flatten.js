// @flow
import hyphenate from 'fbjs/lib/hyphenateStyleName'
import type {Interpolation} from "../constructors/css2";

type StaticAndDynamic = Array<string | Function>

export const objToCss = (obj: Object): string => (
  Object.keys(obj).map(k => `${hyphenate(k)}: ${obj[k]};`).join(" ")
)

const flatten = (chunks: Array<Interpolation>, execContext: ?Array<any>) : StaticAndDynamic => (
  chunks.reduce((array, chunk: Interpolation) => {
    /* Remove falsey values */
    if (!chunk) return array
    /* Flatten arrays */
    if (Array.isArray(chunk)) return array.concat(...flatten(chunk, execContext))
    /* Either execute or defer the function */
    if (typeof chunk === 'function') return execContext
      ? array.concat(...flatten([chunk(...execContext)], execContext))
      : array.concat(chunk)
    /* Handle objects */
    return array.concat(typeof chunk === 'object' ? objToCss(chunk) : chunk.toString())
  }, [])
)

export default flatten
