// @flow
import type { Target } from '../types'

export default function isStyledComponent(target: Target)/* : %checks */ {
  return (
    typeof target === 'function' &&
    typeof target.styledComponentId === 'string'
  )
}
