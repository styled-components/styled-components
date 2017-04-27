// @flow
import type { Interpolation, Target, PropsTransformer } from '../types'

export default (css: Function) => {
  const constructWithOptions = (
    componentConstructor: Function,
    tag: Target,
    options: Object = {},
  ) => {
    /* This is callable directly as a template function */
    const templateFunction = (
      strings: Array<string>,
      ...interpolations: Array<Interpolation>
    ) => componentConstructor(
      tag,
      options,
      css(strings, ...interpolations),
    )

    /* If config methods are called, wrap up a new template function and merge options */

    // Add contents of config to our options
    templateFunction.withConfig = config => constructWithOptions(
      componentConstructor,
      tag,
      { ...options, ...config },
    )

    // Set (or compose) withProps transformer function
    templateFunction.withProps = (transformer: PropsTransformer) => {
      const withProps = options.withProps ?
        props => ({
          ...options.withProps(props),
          ...transformer(props),
        }) :
        transformer

      return constructWithOptions(
        componentConstructor,
        tag,
        { ...options, withProps },
      )
    }

    return templateFunction
  }

  return constructWithOptions
}
