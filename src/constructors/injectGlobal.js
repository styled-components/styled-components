// @flow
import hashStr from '../vendor/glamor/hash'
import StyleSheet from '../models/StyleSheet'
import type { Interpolation, Stringifier } from '../types'

export default (stringifyRules: Stringifier, css: Function) => {
  const injectGlobal = (strings: Array<string>, ...interpolations: Array<Interpolation>) => {
    if (process.env.NODE_ENV !== 'production' && !(Array.isArray(strings))) {
      // eslint-disable-next-line no-console
      console.warn('Incorrect using injectGlobal as a function. Instead use it as a tagged template literal, see: https://www.styled-components.com/docs/api')
    }
    const rules = css(strings, ...interpolations)
    const hash = hashStr(JSON.stringify(rules))

    const componentId = `sc-global-${hash}`
    if (StyleSheet.instance.hasInjectedComponent(componentId)) return

    StyleSheet.instance.inject(componentId, false, stringifyRules(rules))
  }

  return injectGlobal
}
