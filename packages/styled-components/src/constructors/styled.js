// @flow
import type { Target } from '../types'
import domElements from '../utils/domElements'

export default (styledComponent: Function, constructWithOptions: Function) => {
  const styled = (tag: Target) => constructWithOptions(styledComponent, tag)

  // Shorthands for all valid HTML Elements
  domElements.forEach(domElement => {
    styled[domElement] = styled(domElement)
  })

  return styled
}
