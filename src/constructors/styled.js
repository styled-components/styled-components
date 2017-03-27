// @flow
import type { Target } from '../types'
import domElements from '../utils/domElements'

export default (styledComponent: Function, constructWithOptions: Function) => {
  const styled = (tag: Target) => constructWithOptions(styledComponent, tag)

  // Shorthands for all valid HTML Elements
  Object.keys(domElements).forEach(tagName => {
    styled[tagName] = styled(tagName).innerProps(domElements[tagName])
  })

  return styled
}
