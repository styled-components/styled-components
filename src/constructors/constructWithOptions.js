// @flow
import type { Interpolation, Target } from '../types'

export default (css: Function) => {
  const constructWithOptions = (componentConstructor: Function,
                                tag: Target,
                                options: Object = {}) => {
    if (typeof tag !== 'string' && typeof tag !== 'function') {
      // $FlowInvalidInputTest
      throw new Error(`Cannot create styled-component for component: ${tag}`)
    }

    /* This is callable directly as a template function */
    const templateFunction =
      (strings: Array<string>, ...interpolations: Array<Interpolation>) =>
        componentConstructor(tag, options, css(strings, ...interpolations))

    /* If config methods are called, wrap up a new template function and merge options */
    templateFunction.withConfig = config =>
      constructWithOptions(componentConstructor, tag, { ...options, ...config })

    /* attrs could be either a plain object or a function (props => ({ attrs })) */
    templateFunction.attrs = attrs =>
      constructWithOptions(componentConstructor, tag, { ...options,
        attrs: typeof attrs === 'function'
          ? (context) => ({ ...(options.attrs || {}), ...attrs(context) })
          : { ...(options.attrs || {}), ...attrs } })

    return templateFunction
  }

  return constructWithOptions
}
