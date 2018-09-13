// @flow
import css from './css'
import generateAlphabeticName from '../utils/generateAlphabeticName'
import stringifyRules from '../utils/stringifyRules'
import hashStr from '../vendor/glamor/hash'
import Keyframes from '../models/Keyframes'

import type { Interpolation } from '../types'

const replaceWhitespace = (str: string): string => str.replace(/\s|\\n/g, '')

export default function keyframes(
  strings: Array<string>,
  ...interpolations: Array<Interpolation>
): Keyframes {
  const rules = css(strings, interpolations)
  const name = generateAlphabeticName(
    hashStr(replaceWhitespace(JSON.stringify(rules)))
  )

  return new Keyframes(name, stringifyRules(rules, name, '@keyframes'))
}
