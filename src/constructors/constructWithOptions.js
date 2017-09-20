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

    // Creates resolver function which wraps the logic for resolving component attrs.
    // Currently it supports both ways for defining component attrs:
    // - plain object -> styled.input.attrs({ example: 'value' })
    // - factory function -> styled.input.attrs(props => ({ example: props.value })
    const createAttrsResolver = attrs => context => {
      const resolve = attrsObjOrFn => typeof attrsObjOrFn === 'function'
        ? attrsObjOrFn(context)
        : attrsObjOrFn

      return {
        ...resolve(options.resolveAttrs || {}),
        ...resolve(attrs),
      }
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
        resolveAttrs: createAttrsResolver(attrs) })

    return templateFunction
  }

  return constructWithOptions
}
