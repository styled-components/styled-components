// @flow
import hashStr from '../vendor/glamor/hash'
import type { Interpolation, NameGenerator, Stringifier } from '../types'
import StyleSheet from '../models/StyleSheet'

const replaceWhitespace = (str: string): string => str.replace(/\s|\\n/g, '')

export class Keyframes {
  id: string
  name: string
  rules: Array<string>

  constructor(name: string, rules: Array<string>) {
    this.name = name
    this.rules = rules

    this.id = `sc-keyframes-${name}`
  }

  inject(styleSheet: StyleSheet) {
    if (!styleSheet.hasNameForId(this.id, this.name)) {
      styleSheet.inject(this.id, this.rules, this.name)
    }
  }

  toString() {
    return this.name
  }
}

type KeyframesFn = (
  strings: Array<string>,
  ...interpolations: Array<Interpolation>
) => Keyframes

export default (
  nameGenerator: NameGenerator,
  stringifyRules: Stringifier,
  css: Function
): KeyframesFn => (...arr): Keyframes => {
  const rules = css(...arr)
  const name = nameGenerator(hashStr(replaceWhitespace(JSON.stringify(rules))))

  return new Keyframes(name, stringifyRules(rules, name, '@keyframes'))
}
