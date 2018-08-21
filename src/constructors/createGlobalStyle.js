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
      componentWillUnmount() {
        const { sheet } = this.props
        style.removeStyles(sheet)
      }
      render() {
        const { sheet, context } = this.props
        style.renderStyles(context, sheet)
        return null
      }
    }

    class GlobalStyleComponentManager extends React.Component<*, *> {
      static defaultProps: Object

      static styledComponentId = id

      render() {
        if (process.env.NODE_ENV !== 'production') {
          if (typeof this.props.children !== 'undefined') {
            throw new StyledError(11)
          }
        }

        return (
          <StyleSheetConsumer>
            {(styleSheet?: StyleSheet) => {
              if (style.isStatic) {
                return (
                  <GlobalStyleComponent
                    sheet={styleSheet || StyleSheet.master}
                    context={STATIC_EXECUTION_CONTEXT}
                  />
                )
              } else {
                return (
                  <ThemeConsumer>
                    {(theme?: Theme) => {
                      const { defaultProps } = this.constructor
                      let context = {
                        ...this.props,
                      }
                      if (typeof theme !== 'undefined') {
                        const determinedTheme = determineTheme(
                          this.props,
                          theme,
                          defaultProps
                        )
                        // $FlowFixMe TODO: flow for optional styleSheet
                        context = {
                          theme: determinedTheme,
                          ...context,
                        }
                      }
                      return (
                        <GlobalStyleComponent
                          sheet={styleSheet || StyleSheet.master}
                          context={context}
                        />
                      )
                    }}
                  </ThemeConsumer>
                )
              }
            }}
          </StyleSheetConsumer>
        )
      }
    }

    // TODO: Use internal abstractions to avoid additional component layers
    // Depends on a future overall refactoring of theming system / context
    return GlobalStyleComponentManager
  }

  return createGlobalStyle
}
