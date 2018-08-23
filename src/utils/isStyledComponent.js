// @flow
import type { Target } from '../types'

export default function isStyledComponent(target: Target) /* : %checks */ {
  return (
    // $FlowFixMe TODO: flow for styledComponentId
    target && typeof target.styledComponentId === 'string'
  )
}
