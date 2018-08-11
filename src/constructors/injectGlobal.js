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
      'Notice: The "injectGlobal" API has been marked for removal in favor of the upcoming "createGlobalStyle" API that will be available in v4.0+. More info here: https://github.com/styled-components/styled-components/issues/1333'
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

    warnInjectGlobalDeprecated()
  }

  return injectGlobal
}
