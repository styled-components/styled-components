// @flow
import hashStr from '../vendor/glamor/hash'
import StyleSheet from '../models/BrowserStyleSheet'
import type { Interpolation, Stringifier } from '../types'

export default (stringifyRules: Stringifier, css: Function) => {
  const injectGlobal = (strings: Array<string>, ...interpolations: Array<Interpolation>) => {
    const rules = css(strings, ...interpolations)
    const hash = hashStr(JSON.stringify(rules))

    const alreadyInjected = StyleSheet.instance.getName(hash)
    if (alreadyInjected) return

    StyleSheet.instance.inject(`sc-keyframes-${hash}`, false, stringifyRules(rules), hash, hash)
  }

  return injectGlobal
}
