// @flow
// This is copied and modified from src/constructors/keyframes

import hashStr from 'glamor/lib/hash'
import GlobalStyle from '../models/GlobalStyle'
import type { Preprocessed, NameGenerator } from '../types'

const replaceWhitespace = (str: string): string => str.replace(/\s|\\n/g, '')

export default (nameGenerator: NameGenerator) => (chunks: Preprocessed): string => {
  const hash = hashStr(replaceWhitespace(JSON.stringify(chunks)))
  const name = nameGenerator(hash)
  const keyframes = new GlobalStyle(chunks, name)
  keyframes.generateAndInject()
  return name
}
