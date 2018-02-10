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
    const hash = hashStr(JSON.stringify(rules))

    const id = `sc-global-${hash}`
    if (!StyleSheet.master.hasInjectedComponent(id)) {
      StyleSheet.master.inject(id, stringifyRules(rules))
    }
  }

  return injectGlobal
}
