// @flow
import hashStr from '../vendor/glamor/hash'
import type {
  Interpolation,
  NameGenerator,
  RuleSet,
  Stringifier,
} from '../types'
import StyleSheet from '../models/StyleSheet'

const replaceWhitespace = (str: string): string => str.replace(/\s|\\n/g, '')

export class Keyframes {
  id: string
  name: string
  rules: Array<string>

  static extractRules(rules: RuleSet): [RuleSet, RuleSet] {
    const keyframes = []
    const all = []

    rules.forEach(rule => {
      if (rule instanceof Keyframes) {
        // $FlowFixMe
        keyframes.push(rule)
        all.push(rule.getName())
      } else {
        all.push(rule)
      }
    })

    return [keyframes, all]
  }

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

  getName() {
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
