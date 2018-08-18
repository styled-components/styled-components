// @flow
import type { ComponentType } from 'react'

export default function getComponentName(target: ComponentType<*>): string {
  return target.displayName || target.name || 'Component'
}
