// @flow
import type { Target } from '../types'

export default (css: Function) => {
  const constructWithOptions = (
    componentConstructor: Function,
    tag: Target,
    options: Object = {}
  ) => {
    if (typeof tag !== 'string' && typeof tag !== 'function') {
      throw new Error(
        process.env.NODE_ENV !== 'production'
          ? `Cannot create styled-component for component: ${String(tag)}`
          : ''
      )
    }

    /* This is callable directly as a template function */
    // $FlowFixMe: Not typed to avoid destructuring arguments
    const templateFunction = (...args) =>
      componentConstructor(tag, options, css(...args))

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
