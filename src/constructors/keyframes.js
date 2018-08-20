// @flow
import hashStr from '../vendor/glamor/hash'
import type { Interpolation, NameGenerator, Stringifier } from '../types'
import Keyframes from '../models/Keyframes'

const replaceWhitespace = (str: string): string => str.replace(/\s|\\n/g, '')

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
