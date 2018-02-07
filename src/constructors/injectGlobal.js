// @flow
import hashStr from '../vendor/glamor/hash'
import StyleSheet from '../models/StyleSheet'
import type { Interpolation, Stringifier } from '../types'

export default (stringifyRules: Stringifier, css: Function) => {
  const injectGlobal = (
    strings: Array<string>,
    ...interpolations: Array<Interpolation>
  ) => {
    const rules = css(strings, ...interpolations)
    const hash = hashStr(rules.join(''))

    const id = `sc-global-${hash}`
    if (!StyleSheet.global.hasInjectedComponent(id)) {
      StyleSheet.global.inject(id, stringifyRules(rules), hash, id)
    }
  }

  return injectGlobal
}
