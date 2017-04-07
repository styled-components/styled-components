// @flow
import type { Interpolation } from '../types'

export default (GlobalStyle: Function, css: Function) => {
  const injectGlobal = (strings: Array<string>, ...interpolations: Array<Interpolation>) => {
    const globalStyle = new GlobalStyle(css(strings, ...interpolations))
    globalStyle.generateAndInject()
  }

  return injectGlobal
}
