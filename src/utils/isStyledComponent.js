// @flow
import type { Target } from '../types'

export default function isStyledComponent(target: Target) /* : %checks */ {
  return (
    // $FlowFixMe TODO: flow for styledComponentId
    typeof target === 'function' && typeof target.styledComponentId === 'string'
  )
}
