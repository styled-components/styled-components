// @flow
import React from 'react'
import { IS_BROWSER, STATIC_EXECUTION_CONTEXT } from '../constants'
import GlobalStyle from '../models/GlobalStyle'
import StyleSheet from '../models/StyleSheet'
import { StyleSheetConsumer } from '../models/StyleSheetManager'
import StyledError from '../utils/error'
import determineTheme from '../utils/determineTheme'
import { ThemeConsumer, type Theme } from '../models/ThemeProvider'
import hashStr from '../vendor/glamor/hash'
import css from './css'

import type { Interpolation } from '../types'

export default function createGlobalStyle(
  strings: Array<string>,
  ...interpolations: Array<Interpolation>
) {
  const rules = css(strings, ...interpolations)
  const id = `sc-global-${hashStr(JSON.stringify(rules))}`
  const style = new GlobalStyle(rules, id)
  let count = 0

  class GlobalStyleComponent extends React.PureComponent<*, *> {
    static defaultProps: Object
    styleSheet: Object

    static globalStyle = style
    static styledComponentId = id

    constructor() {
      super()

      count += 1

      /**
       * This fixes HMR compatiblility. Don't ask me why, but this combination of
       * caching the closure variables via statics and then persisting the statics in
       * state works across HMR where no other combination did. ¯\_(ツ)_/¯
       */
      this.state = {
        globalStyle: this.constructor.globalStyle,
        styledComponentId: this.constructor.styledComponentId,
      }
    }

    componentWillUnmount() {
      count -= 1

      const { globalStyle, styledComponentId } = this.state

      /**
       * Depending on the order "render" is called this can cause the styles to be lost
       * until the next render pass of the remaining instance, which may
       * not be immediate.
       */
      if (count === 0) globalStyle.removeStyles(this.styleSheet)
      else if (
        process.env.NODE_ENV !== 'production' &&
        IS_BROWSER &&
        count > 1
      ) {
        console.warn(
          `The global style component ${styledComponentId} was composed and rendered multiple times in your React component tree. Only the last-rendered copy will have its styles remain in <head>.`
        )
      }
    }

    render() {
      if (
        process.env.NODE_ENV !== 'production' &&
        React.Children.count(this.props.children)
      ) {
        throw new StyledError(11)
      }

      return (
        <StyleSheetConsumer>
          {(styleSheet?: StyleSheet) => {
            this.styleSheet = styleSheet || StyleSheet.master

            const { globalStyle } = this.state

            if (globalStyle.isStatic) {
              globalStyle.renderStyles(
                STATIC_EXECUTION_CONTEXT,
                this.styleSheet
              )

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

                    globalStyle.renderStyles(context, this.styleSheet)

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
