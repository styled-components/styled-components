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

  const existingName = StyleSheet.instance.getName(hash)
  if (existingName) return existingName

  const name = nameGenerator(hash)
  if (StyleSheet.instance.alreadyInjected(hash, name)) return name

  const generatedCSS = stringifyRules(rules, name, '@keyframes')
  StyleSheet.instance.inject(
    `sc-keyframes-${name}`,
    true,
    generatedCSS,
    hash,
    name
  )
  return name
}
