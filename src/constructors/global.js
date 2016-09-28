import css from './css'
import GlobalStyle from '../models/GlobalStyle'
import type { Interpolation } from '../types'

const global = (strings: Array<string>, ...interpolations: Array<Interpolation>) => {
  const globalStyle = new GlobalStyle(css(strings, ...interpolations))
  globalStyle.generateAndInject()
}

export default global
