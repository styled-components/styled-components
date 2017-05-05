// @flow
import css from './css'
import type { Interpolation, Target } from '../types'
import domElements from '../utils/domElements'

const classNameRegex = /\.[a-z_-][a-z\d_-]*/g

export default (styledComponent: Function) => {
  const styled = (tag: Target) => {
    let newTag = tag
    let name = null
    if (typeof tag === 'string') {
      const hasClass = tag.indexOf('.') !== -1
      if (hasClass && classNameRegex.test(tag)) {
        name = classNameRegex.exec(tag)[0].substr(1)
        newTag = newTag.replace(classNameRegex, '')
      }
    }
    return (strings: Array<string>, ...interpolations: Array<Interpolation>) =>
      styledComponent(newTag, css(strings, ...interpolations), null, name)
  }

  // Shorthands for all valid HTML Elements
  domElements.forEach(domElement => {
    styled[domElement] = styled(domElement)
  })

  return styled
}
