// @flow

/* eslint-disable import/no-unresolved */
import reactNative from 'react-native'

import css from '../constructors/css'

import styledNativeComponent from '../models/StyledNativeComponent'
import ThemeProvider from '../models/ThemeProvider'
import type { Interpolation, Target } from '../types'

const styled = (tag: Target) =>
  (strings: Array<string>, ...interpolations: Array<Interpolation>) =>
    styledNativeComponent(tag, css(strings, ...interpolations))

const proxy = new Proxy(styled, {
  get(target: Function, name: string) {
    if (target.hasOwnProperty(name)) {
      return target[name]
    }

    return styled(name)
  },
})

export { css, ThemeProvider }
export default proxy
