// @flow
import hashStr from '../vendor/glamor/hash'
import type { Interpolation, NameGenerator, Stringifier } from '../types'
import StyleSheet from '../models/BrowserStyleSheet'

const replaceWhitespace = (str: string): string => str.replace(/\s|\\n/g, '')

export default (nameGenerator: NameGenerator, stringifyRules: Stringifier, css: Function) =>
  (strings: Array<string>, ...interpolations: Array<Interpolation>): string => {
    const rules = css(strings, ...interpolations)
    const hash = hashStr(replaceWhitespace(JSON.stringify(rules)))

    const existingName = StyleSheet.instance.getName(hash)
    if (existingName) return existingName

    const name = nameGenerator(hash)
    const generatedCSS = stringifyRules(rules, name, '@keyframes')
    StyleSheet.instance.inject(`sc-keyframes-${hash}`, false, generatedCSS, hash, name)
    return name
  }
