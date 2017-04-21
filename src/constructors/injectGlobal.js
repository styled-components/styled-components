// @flow
import css from './css'
import GlobalStyle from '../models/GlobalStyle'
import type { Interpolation } from '../types'
import enforceArray from '../utils/enforce-array-arguments'

const injectGlobal = (strings: Array<string>, ...interpolations: Array<Interpolation>) => {
  enforceArray('injectGlobal')(strings)

  const globalStyle = new GlobalStyle(css(strings, ...interpolations))
  globalStyle.generateAndInject()
}

export default injectGlobal
