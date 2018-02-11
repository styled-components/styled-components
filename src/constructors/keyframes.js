// @flow
import hashStr from '../vendor/glamor/hash'
import type { Interpolation, NameGenerator, Stringifier } from '../types'
import StyleSheet from '../models/StyleSheet'

const replaceWhitespace = (str: string): string => str.replace(/\s|\\n/g, '')

export default (
  nameGenerator: NameGenerator,
  stringifyRules: Stringifier,
  css: Function
) => (
  strings: Array<string>,
  ...interpolations: Array<Interpolation>
): string => {
  const rules = css(strings, ...interpolations)
  const hash = hashStr(replaceWhitespace(JSON.stringify(rules)))

  const existingName = StyleSheet.master.getNameForHash(hash)
  if (existingName !== undefined) {
    return existingName
  }

  const name = nameGenerator(hash)
  if (StyleSheet.master.alreadyInjected(hash, name)) return name

  StyleSheet.master.inject(
    `sc-keyframes-${name}`,
    stringifyRules(rules, name, '@keyframes'),
    hash,
    name
  )

  return name
}
