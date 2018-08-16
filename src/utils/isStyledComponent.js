// @flow
import type { Target } from '../types'
import isFunction from './isFunction'

export default function isStyledComponent(target: Target) /* : %checks */ {
  return (
    // $FlowFixMe TODO: flow for styledComponentId
    isFunction(target) && typeof target.styledComponentId === 'string'
  )
}
