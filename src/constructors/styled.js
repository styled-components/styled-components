// @flow
import css from './css'
import type { Interpolation, Target } from '../types'
import domElements from '../utils/domElements'
import enforceArray from '../utils/enforce-array-arguments'

export default (styledComponent: Function) => {
  const styled = (tag: Target) =>
    (strings: Array<string>, ...interpolations: Array<Interpolation>) => {
      const tagName = typeof tag === 'string' ? `.${tag}` : '(Component)'
      enforceArray(`styled${tagName}`)(strings)
      return styledComponent(tag, css(strings, ...interpolations))
    }

  // Shorthands for all valid HTML Elements
  domElements.forEach(domElement => {
    styled[domElement] = styled(domElement)
  })

  return styled
}
