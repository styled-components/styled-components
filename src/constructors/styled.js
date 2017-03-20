// @flow
import { DOM } from 'react'
import constructWithOptions from './constructWithOptions'
import type { Target } from '../types'

export default (styledComponent: Function) => {
  const styled = (tag: Target) => constructWithOptions(styledComponent, tag)

  // Shorthands for all valid HTML Elements
  Object.keys(DOM).forEach(domElement => {
    styled[domElement] = styled(domElement)
  })

  return styled
}
