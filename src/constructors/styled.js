// @flow
import constructWithOptions from './constructWithOptions'
import type { Target } from '../types'
import domElements from '../utils/domElements'

export default (styledComponent: Function) => {
  const styled = (tag: Target) => constructWithOptions(styledComponent, tag)

  // Shorthands for all valid HTML Elements
  Object.keys(domElements).forEach(tagName => {
    const attrs = domElements[tagName]
    styled[tagName] = attrs === '*'
      ? styled(tagName).withConfig({ allProps: true })
      : styled(tagName).attrs({ [attrs]: true })
  })

  return styled
}
