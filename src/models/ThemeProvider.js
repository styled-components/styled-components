// @flow
import React, { createContext, Component, type Element } from 'react'
import memoize from 'memoize-one'
import StyledError from '../utils/error'

export type Theme = { [key: string]: mixed }
type ThemeProviderProps = {|
  children?: Element<any>,
  theme: Theme | ((outerTheme: Theme) => void),
|}
export type ThemeContextShape = {|
  theme?: Theme,
|}

const isFunction = test => typeof test === 'function'

const ThemeContext = createContext()

export const ThemeConsumer = ThemeContext.Consumer

/**
 * Provide a theme to an entire react component tree via context
 */
export default class ThemeProvider extends Component<ThemeProviderProps, void> {
  getContext: (
    theme: Theme | ((outerTheme: Theme) => void),
    outerTheme?: Theme
  ) => ThemeContextShape

  constructor(props: ThemeProviderProps) {
    super(props)
    this.getContext = memoize(this.getContext.bind(this))
  }

  // Get the theme from the props, supporting both (outerTheme) => {} as well as object notation
  getTheme(theme: (outerTheme: ?Theme) => void, outerTheme: ?Theme) {
    if (isFunction(theme)) {
      const mergedTheme = theme(outerTheme)

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

    return { ...outerTheme, ...(theme: Object) }
  }

  getContext(theme: (outerTheme: ?Theme) => void, outerTheme?: Theme) {
    return {
      theme: this.getTheme(theme, outerTheme),
    }
  }

  render() {
    const { children, theme } = this.props

    if (!children) {
      return null
    }

    return (
      <ThemeContext.Consumer>
        {(outerContext?: ThemeContextShape) => {
          const outerTheme = outerContext ? outerContext.theme : undefined
          const context = this.getContext(theme, outerTheme)

          return (
            <ThemeContext.Provider value={context}>
              {React.Children.only(children)}
            </ThemeContext.Provider>
          )
        }}
      </ThemeContext.Consumer>
    )
  }
}
