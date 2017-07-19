// @flow
import hashStr from '../vendor/glamor/hash'
import StyleSheet from '../models/StyleSheet'
import type { Interpolation, Stringifier } from '../types'

export default (stringifyRules: Stringifier, css: Function) => {
  const injectGlobal = (strings: Array<string>, ...interpolations: Array<Interpolation>) => {
    if (typeof strings === 'string') {
        // eslint-disable-next-line no-console
      console.warn(
          'injectGlobal: Pass template literal strings without parentheses, global styles are not be applied. ',
        )
    }
    const rules = css(strings, ...interpolations)
    const hash = hashStr(JSON.stringify(rules))

    const componentId = `sc-global-${hash}`
    if (StyleSheet.instance.hasInjectedComponent(componentId)) return

    StyleSheet.instance.inject(componentId, false, stringifyRules(rules))
  }

  return injectGlobal
}
