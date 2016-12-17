// @flow
import css from './css'
import type { Interpolation, Target } from '../types'
import domElements from '../utils/domElements'

export default (styledComponent: Function) => {
  const styled = (tag: Target) =>
    (strings: Array<string>, ...interpolations: Array<Interpolation>) =>
      styledComponent(tag, css(strings, ...interpolations))

  // Shorthands for all valid HTML Elements
  domElements.forEach(domElement => {
    styled[domElement] = styled(domElement)
  })

  return styled
}
