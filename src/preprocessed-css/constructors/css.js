// @flow
import type { Preprocessed, FlatPreprocessed } from '../types'
import flatten from '../utils/flatten'

export default (chunks: Preprocessed): FlatPreprocessed => (
  flatten(chunks)
)
