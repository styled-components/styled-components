// @flow
import constructWithOptions from './constructWithOptions'
import type { Target } from '../types'
import domElements from '../utils/domElements'

export default (styledComponent: Function) => {
  const styled = (tag: Target) => constructWithOptions(styledComponent, tag)

  // Shorthands for all valid HTML Elements
  domElements.forEach(domElement => {
    styled[domElement] = styled(domElement)
  })

  return styled
}
