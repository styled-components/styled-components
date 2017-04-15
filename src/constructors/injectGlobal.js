// @flow
import css from './css'
import GlobalStyle from '../models/GlobalStyle'
import type { Interpolation } from '../types'
import validate from '../utils/validate-arguments'

const injectGlobal = (strings: Array<string>, ...interpolations: Array<Interpolation>) => {
  validate('injectGlobal')(strings)

  const globalStyle = new GlobalStyle(css(strings, ...interpolations))
  globalStyle.generateAndInject()
}

export default injectGlobal
