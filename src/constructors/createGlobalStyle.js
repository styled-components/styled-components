// @flow
import React from 'react'
import { STATIC_EXECUTION_CONTEXT } from '../constants'
import _GlobalStyle from '../models/GlobalStyle'
import StyleSheet from '../models/StyleSheet'
import { StyleSheetConsumer } from '../models/StyleSheetManager'
import StyledError from '../utils/error'
import determineTheme from '../utils/determineTheme'
import { ThemeConsumer, type Theme } from '../models/ThemeProvider'
import type { CSSConstructor, Interpolation, Stringifier } from '../types'
import hashStr from '../vendor/glamor/hash'

export default (
  ComponentStyle: Function,
  stringifyRules: Stringifier,
  css: CSSConstructor
) => {
  const GlobalStyle = _GlobalStyle(ComponentStyle, stringifyRules)

  const createGlobalStyle = (
    strings: Array<string>,
    ...interpolations: Array<Interpolation>
  ) => {
    const rules = css(strings, ...interpolations)
    const id = `sc-global-${hashStr(JSON.stringify(rules))}`
    const style = new GlobalStyle(rules, id)

    class GlobalStyleComponent extends React.Component<*, *> {
      static defaultProps: Object
      styleSheet: Object

      static styledComponentId = id

      componentWillUnmount() {
        style.removeStyles(this.styleSheet)
      }

      render() {
        if (process.env.NODE_ENV !== 'production') {
          if (React.Children.count(this.props.children)) {
            throw new StyledError(11)
          }
        }

        return (
          <StyleSheetConsumer>
            {(styleSheet?: StyleSheet) => {
              this.styleSheet = styleSheet || StyleSheet.master

              if (style.isStatic) {
                style.renderStyles(STATIC_EXECUTION_CONTEXT, this.styleSheet)

                return null
              } else {
                return (
                  <ThemeConsumer>
                    {(theme?: Theme) => {
                      const { defaultProps } = this.constructor

                      const context = {
                        ...this.props,
                      }

                      if (typeof theme !== 'undefined') {
                        context.theme = determineTheme(
                          this.props,
                          theme,
                          defaultProps
                        )
                      }

                      style.renderStyles(context, this.styleSheet)

                      return null
                    }}
                  </ThemeConsumer>
                )
              }
            }}
          </StyleSheetConsumer>
        )
      }
    }

    return GlobalStyleComponent
  }

  return createGlobalStyle
}
