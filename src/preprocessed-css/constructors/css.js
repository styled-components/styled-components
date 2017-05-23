// @flow
import type { Preprocessed } from '../types'
import flatten from '../utils/flatten'

export default (chunks: Preprocessed): Preprocessed => (
  flatten(chunks)
)
