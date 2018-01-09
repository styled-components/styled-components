// @flow
import React from 'react'
import hashStr from '../vendor/glamor/hash'
import StyleSheet from '../models/StyleSheet'
import type { Interpolation, Stringifier } from '../types'

const _createGlobalStyle = (stringifyRules: Stringifier, css: Function) => {
  const createGlobalStyle = (strings: Array<string>, ...interpolations: Array<Interpolation>) => {
    return class extends React.Component {
      componentId = ''

      componentDidMount() {
        const rules = css(strings, ...interpolations)
        const hash = hashStr(JSON.stringify(rules))
        this.componentId = `sc-global-${hash}`
        if (StyleSheet.instance.hasInjectedComponent(this.componentId)) return

        StyleSheet.instance.inject(this.componentId, false, stringifyRules(rules))
      }

      componentWillUnmount() {
        // Remove styles
      }

      render() {
        return null
      }
    }
  }

  return createGlobalStyle
}

export default _createGlobalStyle
