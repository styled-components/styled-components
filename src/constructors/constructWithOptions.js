// @flow
import type { Interpolation, Target } from '../types'

export default (css: Function) => {
  const constructWithOptions = (
    componentConstructor: Function,
    tag: Target,
    options: Object = {},
  ) => {
    if (
      process.env.NODE_ENV !== 'production' &&
      typeof tag !== 'string' &&
      typeof tag !== 'function'
    ) {
      // $FlowInvalidInputTest
      throw new Error(`Cannot create styled-component for component: ${tag}`)
    }

    /* This is callable directly as a template function */
    const templateFunction = (
      strings: Array<string>,
      ...interpolations: Array<Interpolation>
    ) => componentConstructor(tag, options, css(strings, ...interpolations))

    /* If config methods are called, wrap up a new template function and merge options */
    templateFunction.withConfig = config =>
      constructWithOptions(componentConstructor, tag, { ...options, ...config })
    templateFunction.attrs = attrs =>
      constructWithOptions(componentConstructor, tag, {
        ...options,
        attrs: { ...(options.attrs || {}), ...attrs },
      })

    return templateFunction
  }

  return constructWithOptions
}
