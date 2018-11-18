// @flow
import type { ComponentType } from 'react';

export default function getComponentName(target: ComponentType<*> | string): string {
  return typeof target === "string" ? target : target.displayName || target.name || 'Component';
}
