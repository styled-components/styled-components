// @flow
import React, { createContext, Component, type Element } from 'react'
import StyledError from '../utils/error'

const Context = createContext()

export type Theme = { [key: string]: mixed }
type ThemeProviderProps = {|
  children?: Element<any>,
  theme: Theme | ((outerTheme: Theme) => void),
|}

const isFunction = test => typeof test === 'function'

export const ThemeConsumer = Context.Consumer

/**
 * Provide a theme to an entire react component tree via context and event listeners (have to do
 * both context and event emitter as pure components block context updates)
 */
export default class ThemeProvider extends Component<ThemeProviderProps, void> {
  getTheme: (theme?: Theme | ((outerTheme: Theme) => void)) => Theme
  outerTheme: Theme
  props: ThemeProviderProps

  // Get the theme from the props, supporting both (outerTheme) => {} as well as object notation
  getTheme(theme: (outerTheme: Theme) => void) {
    if (isFunction(theme)) {
      const mergedTheme = theme(this.outerTheme)

      if (
        process.env.NODE_ENV !== 'production' &&
        (mergedTheme === null ||
          Array.isArray(mergedTheme) ||
          typeof mergedTheme !== 'object')
      ) {
        throw new StyledError(7)
      }

      return mergedTheme
    }

    if (theme === null || Array.isArray(theme) || typeof theme !== 'object') {
      throw new StyledError(8)
    }

    return { ...this.outerTheme, ...(theme: Object) }
  }

  getContext(theme: Theme | ((outerTheme: Theme) => void)) {
    return {
      getTheme: this.getTheme.bind(this, theme),
    }
  }

  render() {
    const { children, theme } = this.props
    const context = this.getContext(theme)

    if (!children) {
      return null
    }

    return (
      <Context.Provider value={context}>
        {React.Children.only(children)}
      </Context.Provider>
    )
  }
}
