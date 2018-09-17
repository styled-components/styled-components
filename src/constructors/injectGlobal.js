// @flow
import hashStr from '../vendor/glamor/hash'
import StyleSheet from '../models/StyleSheet'
import once from '../utils/once'
import type { Interpolation, Stringifier } from '../types'

type InjectGlobalFn = (
  strings: Array<string>,
  ...interpolations: Array<Interpolation>
) => void

let warnInjectGlobalDeprecated
if (process.env.NODE_ENV !== 'production') {
  warnInjectGlobalDeprecated = once(() => {
    // eslint-disable-next-line no-console
    console.error(
      'Notice: The "injectGlobal" API will be removed in the upcoming v4.0 release. Use "createGlobalStyle" instead. You can find more information here: https://github.com/styled-components/styled-components/issues/1333'
    )
  })
}

export default (stringifyRules: Stringifier, css: Function) => {
  const injectGlobal: InjectGlobalFn = (...args) => {
    const styleSheet = StyleSheet.master
    const rules = css(...args)
    const hash = hashStr(JSON.stringify(rules))
    const id = `sc-global-${hash}`

    if (!styleSheet.hasId(id)) {
      styleSheet.inject(id, stringifyRules(rules))
    }

    if (warnInjectGlobalDeprecated) warnInjectGlobalDeprecated()
  }

  return injectGlobal
}
