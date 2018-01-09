// @flow
import React from 'react'
import PropTypes from 'prop-types'
import hashStr from '../vendor/glamor/hash'
import StyleSheet, { CONTEXT_KEY } from '../models/StyleSheet'
import ServerStyleSheet from '../models/ServerStyleSheet'
import type { Interpolation, Stringifier } from '../types'

export default (stringifyRules: Stringifier, css: Function) => {
  const createGlobalStyle = (
    strings: Array<string>,
    ...interpolations: Array<Interpolation>
  ) =>
    class extends React.Component {
      static contextTypes = {
        [CONTEXT_KEY]: PropTypes.oneOfType([
          PropTypes.instanceOf(StyleSheet),
          PropTypes.instanceOf(ServerStyleSheet),
        ]),
      }
      componentId = ''

      componentWillMount() {
        const rules = css(strings, ...interpolations)
        const hash = hashStr(JSON.stringify(rules))
        const styleSheet = this.context[CONTEXT_KEY] || StyleSheet.instance
        this.componentId = `sc-global-${hash}`

        if (styleSheet.hasInjectedComponent(this.componentId)) return

        styleSheet.inject(this.componentId, false, stringifyRules(rules))
      }

      componentWillUnmount() {
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
