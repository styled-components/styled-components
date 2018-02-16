// @flow
import React from 'react'
import PropTypes from 'prop-types'
import { CONTEXT_KEY, STATIC_EXECUTION_CONTEXT } from '../constants'
import _GlobalStyle from '../models/GlobalStyle'
import StyleSheet from '../models/StyleSheet'
import ServerStyleSheet from '../models/ServerStyleSheet'
import type { CSSConstructor, Interpolation, Stringifier } from '../types'
import withTheme from '../hoc/withTheme'

export default (stringifyRules: Stringifier, css: CSSConstructor) => {
  const GlobalStyle = _GlobalStyle(stringifyRules)

  const createGlobalStyle = (
    strings: Array<string>,
    ...interpolations: Array<Interpolation>
  ) => {
    const rules = css(strings, ...interpolations)
    const style = new GlobalStyle(rules, {}, '')

    class GlobalStyleComponent extends React.Component {
      static contextTypes = {
        [CONTEXT_KEY]: PropTypes.oneOfType([
          PropTypes.instanceOf(StyleSheet),
          PropTypes.instanceOf(ServerStyleSheet),
        ]),
      }

      static styledComponentId = 'global'

      componentWillMount() {
        const { props } = this
        const sheet = this.context[CONTEXT_KEY] || StyleSheet.master
        const context = style.isStatic ? STATIC_EXECUTION_CONTEXT : { ...props }

        style.createStyles(context, sheet)
      }

      componentWillReceiveProps(props: { [prop: string]: any }) {
        const sheet = this.context[CONTEXT_KEY] || StyleSheet.master
        const context = style.isStatic ? STATIC_EXECUTION_CONTEXT : { ...props }

        style.updateStyles(context, sheet)
      }

      componentWillUnmount() {
        const sheet = this.context[CONTEXT_KEY] || StyleSheet.master
        style.removeStyles(sheet)
      }

      render() {
        return null
      }
    }

    return withTheme(GlobalStyleComponent)
  }

  return createGlobalStyle
}
