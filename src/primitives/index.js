// @flow

/* eslint-disable import/no-unresolved */
import reactPrimitives from 'react-primitives'

import _StyledNativeComponent from '../models/StyledNativeComponent'
import _constructWithOptions from '../constructors/constructWithOptions'

import css from '../constructors/css'
import ThemeProvider from '../models/ThemeProvider'
import withTheme from '../hoc/withTheme'

import type { Target } from '../types'

const constructWithOptions = _constructWithOptions(css)
const StyledNativeComponent = _StyledNativeComponent(
  constructWithOptions,
  reactPrimitives.StyleSheet,
)
const styled = (tag: Target) => constructWithOptions(StyledNativeComponent, tag)

/* React native lazy-requires each of these modules for some reason, so let's
*  assume it's for a good reason and not eagerly load them all */
const aliases = 'Image Text Touchable View '

/* Define a getter for each alias which simply gets the reactNative component
 * and passes it to styled */
aliases.split(/\s+/m).forEach(alias => Object.defineProperty(styled, alias, {
  enumerable: true,
  configurable: false,
  get() {
    return styled(reactPrimitives[alias])
  },
}))

export { css, ThemeProvider, withTheme }
export default styled
