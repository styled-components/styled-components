// @flow
import type { FlatRuleSet } from '../types'

const trimStart = (str: string): string => {
  let index = 0

  while (
    index < str.length &&
    /\s/.test(str[index])
  ) {
    index += 1
  }

  return str.slice(index)
}

const prefixPreprocessedSelectors = (prefix: string, css: FlatRuleSet): FlatRuleSet => {
  const first = css[0]
  if (typeof first !== 'string') {
    throw new TypeError('Expected css array to start with a string')
  }

  const trimmed = trimStart(first)
  const newFirst = (
    prefix +
    (trimmed.startsWith(':') ? '' : ' ') +
    trimmed
  )

  return [newFirst].concat(css.slice(1))
}

export default prefixPreprocessedSelectors
