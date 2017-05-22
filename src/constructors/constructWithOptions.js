// @flow
import type { Interpolation, Target } from '../types'

const splitKeys = obj => {
  const result = {}
  Object.keys(obj).forEach(ks => ks.trim().split(/\s+/).forEach(k => {
    result[k] = obj[ks]
  }))
  return result
}

export default (css: Function) => {
  const constructWithOptions = (componentConstructor: Function,
                                tag: Target,
                                options: Object = {}) => {
    /* This is callable directly as a template function */
    const templateFunction =
      (strings: Array<string>, ...interpolations: Array<Interpolation>) =>
        componentConstructor(tag, options, css(strings, ...interpolations), templateFunction)

    /* If config methods are called, wrap up a new template function and merge options */
    templateFunction.withConfig = config =>
      constructWithOptions(componentConstructor, tag, { ...options, ...config })
    templateFunction.attrs = attrs =>
      constructWithOptions(componentConstructor, tag, { ...options,
        attrs: { ...(options.attrs || {}), ...splitKeys(attrs) } })
    templateFunction.innerProps = innerProps =>
      constructWithOptions(componentConstructor, tag, { ...options,
        innerProps: { ...(options.innerProps || {}), ...splitKeys(innerProps) } })

    return templateFunction
  }

  return constructWithOptions
}
