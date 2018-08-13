// @flow
import React from 'react'
import { STATIC_EXECUTION_CONTEXT } from '../constants'
import _GlobalStyle from '../models/GlobalStyle'
import StyleSheet from '../models/StyleSheet'
import determineTheme from '../utils/determineTheme'
import { ThemeConsumer, type Theme } from '../models/ThemeProvider'
import { StyleSheetConsumer } from '../models/StyleSheetManager'
import type { CSSConstructor, Interpolation, Stringifier } from '../types'
import hashStr from '../vendor/glamor/hash'

export default (stringifyRules: Stringifier, css: CSSConstructor) => {
  const GlobalStyle = _GlobalStyle(stringifyRules)

  const createGlobalStyle = (
    strings: Array<string>,
    ...interpolations: Array<Interpolation>
  ) => {
    const rules = css(strings, ...interpolations)
    const id = `sc-global-${hashStr(JSON.stringify(rules))}`
    const style = new GlobalStyle(rules, id)

    class GlobalStyleComponent extends React.Component<*, *> {
      static defaultProps: Object
      // static contextTypes = {
      //   [CONTEXT_KEY]: PropTypes.oneOfType([
      //     PropTypes.instanceOf(StyleSheet),
      //     PropTypes.instanceOf(ServerStyleSheet),
      //   ]),
      // }

      static styledComponentId = id

      // componentWillMount() {
      //   const { props } = this
      //   const sheet = this.context[CONTEXT_KEY] || StyleSheet.master
      //   const context = style.isStatic ? STATIC_EXECUTION_CONTEXT : { ...props }

      //   style.createStyles(context, sheet)
      // }

      // componentWillReceiveProps(props: { [prop: string]: any }) {
      //   const sheet = this.context[CONTEXT_KEY] || StyleSheet.master
      //   const context = style.isStatic ? STATIC_EXECUTION_CONTEXT : { ...props }

      //   style.updateStyles(context, sheet)
      // }

      // componentWillUnmount() {
      //   const sheet = this.context[CONTEXT_KEY] || StyleSheet.master
      //   style.removeStyles(sheet)
      // }

      render() {
        if (process.env.NODE_ENV !== 'production') {
          if (typeof this.props.children !== 'undefined') {
            // eslint-disable-next-line no-console
            console.warn(
              `[createGlobalStyle] received children which will not be rendered. Please use the component without passing children elements.`
            )
          }
        }

        return (
          <StyleSheetConsumer>
            {(styleSheet?: StyleSheet) => (
              <ThemeConsumer>
                {(theme?: Theme) => {
                  const { defaultProps } = this.constructor

                  if (style.isStatic) {
                    // $FlowFixMe TODO: flow for optional styleSheet
                    style.updateStyles(STATIC_EXECUTION_CONTEXT, styleSheet)
                  } else if (typeof theme !== 'undefined') {
                    const determinedTheme = determineTheme(
                      this.props,
                      theme,
                      defaultProps
                    )
                    // $FlowFixMe TODO: flow for optional styleSheet
                    style.updateStyles(determinedTheme, styleSheet)
                  }
                  return null
                }}
              </ThemeConsumer>
            )}
          </StyleSheetConsumer>
        )
      }
    }

    // TODO: Use internal abstractions to avoid additional component layers
    // Depends on a future overall refactoring of theming system / context
    return GlobalStyleComponent
  }

  return createGlobalStyle
}
