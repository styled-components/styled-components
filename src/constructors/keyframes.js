// @flow
import hashStr from '../vendor/glamor/hash'
import type { Interpolation, NameGenerator, Stringifier } from '../types'
import StyleSheet from '../models/StyleSheet'

const replaceWhitespace = (str: string): string => str.replace(/\s|\\n/g, '')

export class Keyframes {
  name: string
  rules: Array<Interpolation>

  constructor(
    name: string,
    rules: Array<Interpolation>,
    stringifyRules: Stringifier
  ) {
    this.name = name
    this.rules = rules

    const styleSheet = StyleSheet.master

    const id = `sc-keyframes-${name}`

    if (!styleSheet.hasNameForId(id, name) && false) {
      styleSheet.inject(id, stringifyRules(rules, name, '@keyframes'), name)
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

  // return name
  return new Keyframes(name, rules, stringifyRules)
}
