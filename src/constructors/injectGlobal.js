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
    const styleSheet = StyleSheet.master
    const rules = css(...args)
    const hash = hashStr(JSON.stringify(rules))
    const id = `sc-global-${hash}`

    if (!styleSheet.hasId(id)) {
      styleSheet.inject(id, stringifyRules(rules))
    }
  }

  return injectGlobal
}
