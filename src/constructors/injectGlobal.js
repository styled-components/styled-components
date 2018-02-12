// @flow
import hashStr from '../vendor/glamor/hash'
import StyleSheet from '../models/StyleSheet'
import type { Interpolation, Stringifier } from '../types'

type InjectGlobalFn = (
  strings: Array<string>,
  ...interpolations: Array<Interpolation>
) => void

export default (stringifyRules: Stringifier, css: Function) => {
  const injectGlobal: InjectGlobalFn = (...args) => {
    const rules = css(...args)
    const hash = hashStr(JSON.stringify(rules))

    const id = `sc-global-${hash}`
    if (!StyleSheet.master.hasInjectedComponent(id)) {
      StyleSheet.master.inject(id, stringifyRules(rules))
    }
  }

  return injectGlobal
}
