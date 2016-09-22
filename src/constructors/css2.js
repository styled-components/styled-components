// @flow
import hyphenate from 'fbjs/lib/hyphenateStyleName'

export type Interpolation = Function | Object | string

export const interleave = (strings: Array<string>, interpolations: Array<Interpolation>) => (
  interpolations.reduce((array, interp, i) => (
    array.concat(interp, strings[i + 1])
  ), [strings[0]])
)

type StaticAndDynamic = Array<string | Function>

export const objToCss = (obj: Object): string => (
  Object.keys(obj).map(k => `${hyphenate(k)}: ${obj[k]};`).join(" ")
)

export const flatten = (chunks: Array<Interpolation>) : StaticAndDynamic => (
  chunks.reduce((array, chunk: Interpolation) => {
    /* Remove falsey values */
    if (!chunk) return array
    /* Defer functions */
    if (typeof chunk === 'function') return array.concat(chunk)
    /* Handle objects */
    const stringChunk: string = typeof chunk === 'object' ? objToCss(chunk) : chunk.toString()
    const last = array[array.length - 1]
    if (last && typeof last === "string") {
      return array.slice(0, -1).concat(`${last}${stringChunk}`)
    } else {
      return array.concat(stringChunk)
    }
  }, [])
)

export default (strings: Array<string>, ...interpolations: Array<Interpolation>) => {

}
