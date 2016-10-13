// @flow
import hashStr from 'glamor/lib/hash'
import css from './css'
import GlobalStyle from '../models/GlobalStyle'
import type { Interpolation, NameGenerator } from '../types'

const replaceWhitespace = (str: string): string => str.replace(/\s|\\n/g, '')

export default (nameGenerator: NameGenerator) =>
  (strings: Array<string>, ...interpolations: Array<Interpolation>): string => {
    const rules = css(strings, ...interpolations)
    const hash = hashStr(replaceWhitespace(JSON.stringify(rules)))
    const name = nameGenerator(hash)
    const keyframes = new GlobalStyle(rules, `@keyframes ${name}`)
    keyframes.generateAndInject()
    return name
  }
