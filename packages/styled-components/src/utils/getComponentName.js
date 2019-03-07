// @flow
import type { ComponentType } from 'react';

export function getComponentName(target: ComponentType<*>): string {
  return (
    (process.env.NODE_ENV !== 'production' ? typeof target === 'string' && target : false) ||
    target.displayName ||
    target.name ||
    'Component'
  );
}
