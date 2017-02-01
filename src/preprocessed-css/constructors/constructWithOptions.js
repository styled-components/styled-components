// @flow
// This is copied and modified from src/constructors/constructWithOptions

import css from './css'
import type { Preprocessed, Target } from '../types'

const constructWithOptions = (
  componentConstructor: Function,
  tag: Target,
  options: Object = {},
) => {
  const templateFunction = (preprocessed: Preprocessed) => (
    componentConstructor(tag, options, css(preprocessed))
  )

  /* If withConfig is called, wrap up a new template function and merge options */
  templateFunction.withConfig = config => (
    constructWithOptions(componentConstructor, tag, { ...options, ...config })
  )

  return templateFunction
}

export default constructWithOptions
