// @flow
import hashStr from '../vendor/glamor/hash'
import StyleSheet from '../models/StyleSheet'
import type { Interpolation, NameGenerator, Stringifier } from '../types'

type InjectGlobalFn = (
  strings: Array<string>,
  ...interpolations: Array<Interpolation>
) => void

export default (
  nameGenerator: NameGenerator,
  stringifyRules: Stringifier,
  css: Function
) => {
  const injectGlobal: InjectGlobalFn = (...args) => {
    const styleSheet = StyleSheet.master
    const rules = css(...args)
    const name = nameGenerator(hashStr(JSON.stringify(rules)))
    const id = `sc-global-${name}`

    if (!styleSheet.hasNameForId(id, name)) {
      styleSheet.inject(id, stringifyRules(rules), name)
    }
  }

  return injectGlobal
}
