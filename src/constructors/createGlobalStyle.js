// @flow
import React from 'react'
import PropTypes from 'prop-types'
import hashStr from '../vendor/glamor/hash'
import StyleSheet, { CONTEXT_KEY } from '../models/StyleSheet'
import ServerStyleSheet from '../models/ServerStyleSheet'
import type { Interpolation, Stringifier } from '../types'
import {
  CHANNEL,
  CHANNEL_NEXT,
  CONTEXT_CHANNEL_SHAPE,
} from '../models/ThemeProvider'

export default (stringifyRules: Stringifier, css: Function) => {
  const createGlobalStyle = (
    strings: Array<string>,
    ...interpolations: Array<Interpolation>
  ) =>
    class extends React.Component {
      static contextTypes = {
        [CHANNEL]: PropTypes.func,
        [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
        [CONTEXT_KEY]: PropTypes.oneOfType([
          PropTypes.instanceOf(StyleSheet),
          PropTypes.instanceOf(ServerStyleSheet),
        ]),
      }
      state = { theme: {} }
      componentId = ''
      unsubscribeId = -1

      componentWillMount() {
        const context = this.context[CHANNEL_NEXT]
        const theme = typeof context !== 'undefined' ? context.getTheme() : {}

        if (typeof context !== 'undefined') {
          this.setState({ theme })

          this.unsubscribeId = context.subscribe(nextTheme => {
            this.setState({
              theme: nextTheme,
            })
          })
        }

        const rules = css(
          strings,
          ...interpolations.map(interpol => {
            if (typeof interpol === 'function') {
              return interpol({
                theme,
                ...this.props,
              })
            }
            return interpol
          })
        )
        const hash = hashStr(JSON.stringify(rules))
        const styleSheet = this.context[CONTEXT_KEY] || StyleSheet.instance
        this.componentId = `sc-global-${hash}`

        if (styleSheet.hasInjectedComponent(this.componentId)) return

        styleSheet.inject(this.componentId, false, stringifyRules(rules))
      }

      // TODO: handle updates of existing injected rules
      // instead of appending them always
      componentWillReceiveProps(props, ctx) {
        const context = ctx[CHANNEL_NEXT]
        const theme = typeof context !== 'undefined' ? context.getTheme() : {}

        if (typeof context !== 'undefined') {
          this.setState({ theme })

          this.unsubscribeId = context.subscribe(nextTheme => {
            this.setState({
              theme: nextTheme,
            })
          })
        }

        const rules = css(
          strings,
          ...interpolations.map(interpol => {
            if (typeof interpol === 'function') {
              return interpol({
                theme,
                ...this.props,
              })
            }
            return interpol
          })
        )
        const hash = hashStr(JSON.stringify(rules))
        const styleSheet = this.context[CONTEXT_KEY] || StyleSheet.instance
        this.componentId = `sc-global-${hash}`

        if (styleSheet.hasInjectedComponent(this.componentId)) return

        styleSheet.inject(this.componentId, false, stringifyRules(rules))
      }

      componentWillUnmount() {
        if (this.unsubscribeId !== -1) {
          this.context[CHANNEL_NEXT].unsubscribe(this.unsubscribeId)
        }
        const styleSheet = this.context[CONTEXT_KEY] || StyleSheet.instance
        if (!styleSheet.hasInjectedComponent(this.componentId)) return
        styleSheet.removeComponent(this.componentId)
      }

      render() {
        return null
      }
    }

  return createGlobalStyle
}
