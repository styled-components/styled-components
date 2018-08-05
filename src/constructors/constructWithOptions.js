// @flow
import { isValidElementType } from 'react-is'
import StyledError from '../utils/error'
import { EMPTY_OBJECT } from '../utils/empties'
import type { Target } from '../types'

export default (css: Function) => {
  const constructWithOptions = (
    componentConstructor: Function,
    tag: Target,
    options: Object = EMPTY_OBJECT
  ) => {
    if (!isValidElementType(tag)) {
      throw new StyledError(1, String(tag))
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
        attrs: { ...(options.attrs || EMPTY_OBJECT), ...attrs },
      })

    return templateFunction
  }

  return constructWithOptions
}
