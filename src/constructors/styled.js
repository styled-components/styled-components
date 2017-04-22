// @flow
import domElements from 'react-dom-elements'

import css from './css'
import type { Interpolation, Target } from '../types'

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
